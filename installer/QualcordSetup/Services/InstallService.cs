using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Net.Http;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using CustomInstaller.Models;

namespace CustomInstaller.Services;

public class InstallService
{
    public List<DiscordBranch> FindDiscordInstallations()
    {
        var list = new List<DiscordBranch>();
        string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);

        CheckAndAdd(list, "Discord (Standard)", Path.Combine(localAppData, "Discord"), "Discord");
        CheckAndAdd(list, "Discord PTB", Path.Combine(localAppData, "DiscordPTB"), "DiscordPTB");
        CheckAndAdd(list, "Discord Canary", Path.Combine(localAppData, "DiscordCanary"), "DiscordCanary");
        CheckAndAdd(list, "Discord Development", Path.Combine(localAppData, "DiscordDevelopment"), "DiscordDevelopment");

        return list;
    }

    private void CheckAndAdd(List<DiscordBranch> list, string name, string dir, string procName)
    {
        if (!Directory.Exists(dir)) return;

        string[] appDirs = Directory.GetDirectories(dir, "app-*");
        if (appDirs.Length == 0) return;

        Array.Sort(appDirs);
        string latest = appDirs[appDirs.Length - 1];
        string version = Path.GetFileName(latest);

        bool isPatched = false;
        string resourcesDir = Path.Combine(latest, "resources");
        string asarDir = Path.Combine(resourcesDir, "app.asar");
        if (Directory.Exists(asarDir))
        {
            string indexJs = Path.Combine(asarDir, "index.js");
            if (File.Exists(indexJs))
            {
                try
                {
                    string content = File.ReadAllText(indexJs);
                    if (content.IndexOf("patcher.js", StringComparison.OrdinalIgnoreCase) >= 0)
                        isPatched = true;
                }
                catch { }
            }
        }

        list.Add(new DiscordBranch
        {
            Name = name,
            Path = dir,
            ProcessName = procName,
            Version = version,
            AppDirPath = latest,
            IsPatched = isPatched
        });
    }

    public bool IsGitInstalled()
    {
        string[] knownPaths = new string[]
        {
            @"C:\Program Files\Git\cmd\git.exe",
            @"C:\Program Files\Git\bin\git.exe",
            @"C:\Program Files (x86)\Git\cmd\git.exe",
            @"C:\Program Files (x86)\Git\bin\git.exe",
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\Git\cmd\git.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\Git\bin\git.exe")
        };

        foreach (string path in knownPaths)
        {
            if (File.Exists(path)) return true;
        }

        string? pathEnv = Environment.GetEnvironmentVariable("PATH");
        if (!string.IsNullOrEmpty(pathEnv))
        {
            foreach (string dir in pathEnv.Split(';', StringSplitOptions.RemoveEmptyEntries))
            {
                try
                {
                    if (Directory.Exists(dir) && File.Exists(Path.Combine(dir, "git.exe")))
                        return true;
                }
                catch { }
            }
        }

        return false;
    }

    public async Task EnsureGitInstalledAsync(IProgress<(int percent, string status)> progress, CancellationToken ct)
    {
        if (IsGitInstalled()) return;

        progress.Report((20, "Richte Git für Windows ein..."));

        // 1. Try winget
        try
        {
            string localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string wingetExe = Path.Combine(localApp, @"Microsoft\WindowsApps\winget.exe");
            string runner = File.Exists(wingetExe) ? wingetExe : "winget.exe";

            var psi = new ProcessStartInfo
            {
                FileName = runner,
                Arguments = "install --id Git.Git -e --source winget --silent --accept-source-agreements --accept-package-agreements",
                UseShellExecute = false,
                CreateNoWindow = true
            };
            using var p = Process.Start(psi);
            if (p != null)
            {
                await p.WaitForExitAsync(ct);
                if (IsGitInstalled()) return;
            }
        }
        catch { }

        // 2. Direct download
        try
        {
            progress.Report((25, "Lade offiziellen Git-Installer herunter..."));
            string tempInstaller = Path.Combine(Path.GetTempPath(), "Git-64-bit-installer.exe");

            using (var client = new HttpClient())
            {
                client.DefaultRequestHeaders.UserAgent.ParseAdd("QualcordInstaller/1.0");
                byte[] data = await client.GetByteArrayAsync("https://github.com/git-for-windows/git/releases/latest/download/Git-64-bit.exe", ct);
                await File.WriteAllBytesAsync(tempInstaller, data, ct);
            }

            progress.Report((35, "Führe Installation von Git aus..."));
            var psi = new ProcessStartInfo
            {
                FileName = tempInstaller,
                Arguments = "/VERYSILENT /NORESTART /NOCANCEL /SP- /CLOSEAPPLICATIONS /SUPPRESSMSGBOXES",
                UseShellExecute = true
            };
            using var p = Process.Start(psi);
            if (p != null)
            {
                await p.WaitForExitAsync(ct);
            }

            try { File.Delete(tempInstaller); } catch { }
        }
        catch { }
    }

    public void KillDiscordProcesses(string procName)
    {
        Process[] procs = Process.GetProcessesByName(procName);
        foreach (var p in procs)
        {
            try
            {
                p.Kill();
                p.WaitForExit(3000);
            }
            catch { }
        }
    }

    public void ExtractQualcordPayload(string destinationDir, IProgress<(int percent, string status)> progress)
    {
        if (!Directory.Exists(destinationDir))
            Directory.CreateDirectory(destinationDir);

        progress.Report((45, "Bereite Qualcord Dateien vor..."));

        Stream? zipStream = null;

        // Try embedded resource first
        var assembly = Assembly.GetExecutingAssembly();
        string[] resourceNames = assembly.GetManifestResourceNames();
        string? targetRes = resourceNames.FirstOrDefault(r => r.EndsWith("payload.zip", StringComparison.OrdinalIgnoreCase) || r.EndsWith("QualcordDistZip", StringComparison.OrdinalIgnoreCase));

        if (!string.IsNullOrEmpty(targetRes))
        {
            zipStream = assembly.GetManifestResourceStream(targetRes);
        }

        // Fallback: look for payload.zip or Qualcord-dist.zip on disk
        if (zipStream == null)
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string[] localZipCandidates = new string[]
            {
                Path.Combine(baseDir, "payload.zip"),
                Path.Combine(baseDir, "Qualcord-dist.zip"),
                Path.Combine(baseDir, "Resources", "payload.zip")
            };

            foreach (string candidate in localZipCandidates)
            {
                if (File.Exists(candidate))
                {
                    zipStream = File.OpenRead(candidate);
                    break;
                }
            }
        }

        if (zipStream == null)
            throw new FileNotFoundException("Qualcord Payload (payload.zip) konnte weder in den Ressourcen noch im Programmverzeichnis gefunden werden!");

        using (zipStream)
        using (var archive = new ZipArchive(zipStream, ZipArchiveMode.Read))
        {
            foreach (var entry in archive.Entries)
            {
                if (string.IsNullOrEmpty(entry.Name)) continue; // Directory entry

                string destPath = Path.Combine(destinationDir, entry.FullName);
                string? destDirPath = Path.GetDirectoryName(destPath);
                if (!string.IsNullOrEmpty(destDirPath) && !Directory.Exists(destDirPath))
                    Directory.CreateDirectory(destDirPath);

                entry.ExtractToFile(destPath, true);
            }
        }
    }

    public async Task InstallAsync(
        DiscordBranch branch,
        InstallOptions options,
        IProgress<(int percent, string status)> progress,
        Action<string> log,
        CancellationToken ct)
    {
        await Task.Run(async () =>
        {
            progress.Report((5, "Initialisiere Installation..."));
            log($"Starte Installation für: {branch.Name} ({branch.Version})");

            // 1. Close Discord
            progress.Report((10, "Beende laufende Discord-Prozesse..."));
            log($"Schließe {branch.ProcessName}...");
            KillDiscordProcesses(branch.ProcessName);
            await Task.Delay(800, ct);

            // 2. Git
            if (options.InstallGit && !IsGitInstalled())
            {
                log("Git für Windows wird eingerichtet...");
                await EnsureGitInstalledAsync(progress, ct);
            }

            // 3. Extract Qualcord Files
            string qualcordDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Qualcord", "dist");
            progress.Report((40, "Entpacke Qualcord Client..."));
            log($"Kopiere Dateien nach: {qualcordDir}");
            ExtractQualcordPayload(qualcordDir, progress);

            // 4. Patch Discord app.asar
            progress.Report((70, "Patche Discord Injection..."));
            string resourcesDir = Path.Combine(branch.AppDirPath, "resources");
            if (!Directory.Exists(resourcesDir))
                throw new DirectoryNotFoundException($"Discord resources Verzeichnis nicht gefunden: {resourcesDir}");

            string appAsarFile = Path.Combine(resourcesDir, "app.asar");
            string backupAsar = Path.Combine(resourcesDir, "_app.asar");

            if (File.Exists(appAsarFile))
            {
                if (!File.Exists(backupAsar))
                {
                    log("Sichere originales app.asar als _app.asar...");
                    File.Move(appAsarFile, backupAsar);
                }
                else
                {
                    File.Delete(appAsarFile);
                }
            }

            if (!Directory.Exists(appAsarFile))
            {
                Directory.CreateDirectory(appAsarFile);
            }

            // package.json & index.js
            string pkgJsonPath = Path.Combine(appAsarFile, "package.json");
            File.WriteAllText(pkgJsonPath, "{\"name\":\"discord\",\"main\":\"index.js\"}");

            string patcherJsPath = Path.Combine(qualcordDir, "patcher.js").Replace("\\", "\\\\");
            string indexJsContent = $"require(\"{patcherJsPath}\");\n";
            string indexJsPath = Path.Combine(appAsarFile, "index.js");
            File.WriteAllText(indexJsPath, indexJsContent);

            log("Discord Hook erfolgreich geschrieben.");
            progress.Report((90, "Schließe Einrichtung ab..."));

            // 5. Restart Discord
            if (options.AutoRestartDiscord)
            {
                progress.Report((95, "Starte Discord neu..."));
                log("Starte Discord mit aktiver Qualcord-Erweiterung...");
                LaunchDiscord(branch);
            }

            progress.Report((100, "Qualcord erfolgreich installiert!"));
            log("Installation erfolgreich abgeschlossen!");
        }, ct);
    }

    public async Task UninstallAsync(
        DiscordBranch branch,
        IProgress<(int percent, string status)> progress,
        Action<string> log,
        CancellationToken ct)
    {
        await Task.Run(async () =>
        {
            progress.Report((10, "Beende Discord..."));
            log($"Beende {branch.ProcessName} für Deinstallation...");
            KillDiscordProcesses(branch.ProcessName);
            await Task.Delay(800, ct);

            progress.Report((40, "Stelle Discord-Originaldateien wieder her..."));

            string[] appDirs = Directory.GetDirectories(branch.Path, "app-*");
            foreach (string appDir in appDirs)
            {
                string resourcesDir = Path.Combine(appDir, "resources");
                string appAsarDir = Path.Combine(resourcesDir, "app.asar");
                string backupAsar = Path.Combine(resourcesDir, "_app.asar");

                if (Directory.Exists(appAsarDir))
                {
                    try
                    {
                        Directory.Delete(appAsarDir, true);
                        log($"Qualcord Hook-Verzeichnis entfernt in {Path.GetFileName(appDir)}");
                    }
                    catch (Exception ex)
                    {
                        log($"Warnung beim Löschen: {ex.Message}");
                    }
                }

                if (File.Exists(backupAsar) && !File.Exists(appAsarDir))
                {
                    File.Move(backupAsar, appAsarDir);
                    log($"Originales _app.asar wiederhergestellt in {Path.GetFileName(appDir)}");
                }
            }

            progress.Report((100, "Deinstallation erfolgreich abgeschlossen."));
            log("Qualcord wurde erfolgreich aus Discord entfernt.");
        }, ct);
    }

    public void LaunchDiscord(DiscordBranch branch)
    {
        string updateExe = Path.Combine(branch.Path, "Update.exe");
        if (File.Exists(updateExe))
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = updateExe,
                Arguments = $"--processStart {branch.ProcessName}.exe",
                UseShellExecute = true
            });
        }
        else
        {
            string directExe = Path.Combine(branch.AppDirPath, $"{branch.ProcessName}.exe");
            if (File.Exists(directExe))
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = directExe,
                    UseShellExecute = true
                });
            }
        }
    }
}

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

namespace QualcordInstaller
{
    public class DiscordBranch
    {
        public string Name { get; set; }
        public string Path { get; set; }
        public string ProcessName { get; set; }
        public override string ToString() { return Name; }
    }

    public class InstallerForm : Form
    {
        private ComboBox comboDiscordBranch;
        private Button btnInstall;
        private Button btnUninstall;
        private CheckBox chkStartDiscord;
        private RichTextBox txtLog;
        private ProgressBar progressBar;
        private Label lblStatus;

        private List<DiscordBranch> detectedBranches = new List<DiscordBranch>();

        [STAThread]
        public static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            bool silent = false;
            bool uninstall = false;
            foreach (string arg in args)
            {
                if (arg.Equals("/silent", StringComparison.OrdinalIgnoreCase) || arg.Equals("-silent", StringComparison.OrdinalIgnoreCase))
                    silent = true;
                if (arg.Equals("/uninstall", StringComparison.OrdinalIgnoreCase) || arg.Equals("-uninstall", StringComparison.OrdinalIgnoreCase))
                    uninstall = true;
            }

            if (silent)
            {
                InstallerLogic logic = new InstallerLogic();
                var branches = logic.FindDiscordInstallations();
                if (branches.Count > 0)
                {
                    if (uninstall)
                        logic.Uninstall(branches[0], null);
                    else
                        logic.Install(branches[0], true, null);
                }
                return;
            }

            Application.Run(new InstallerForm());
        }

        public InstallerForm()
        {
            InitializeComponent();
            LoadBranches();
        }

        private void InitializeComponent()
        {
            this.Text = "Qualcord 1-Klick Installer (v1.0.9)";
            this.Size = new Size(540, 480);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.BackColor = Color.FromArgb(30, 31, 34);
            this.ForeColor = Color.White;
            this.Font = new Font("Segoe UI", 9F, FontStyle.Regular);

            // Header Panel
            Panel pnlHeader = new Panel();
            pnlHeader.Dock = DockStyle.Top;
            pnlHeader.Height = 85;
            pnlHeader.BackColor = Color.FromArgb(20, 21, 24);

            Label lblTitle = new Label();
            lblTitle.Text = "⚡ Qualcord Client Installer";
            lblTitle.Font = new Font("Segoe UI", 16F, FontStyle.Bold);
            lblTitle.ForeColor = Color.FromArgb(88, 101, 242);
            lblTitle.Location = new Point(20, 15);
            lblTitle.AutoSize = true;
            pnlHeader.Controls.Add(lblTitle);

            Label lblSubtitle = new Label();
            lblSubtitle.Text = "1-Klick Installation & Mod-Integration fr Discord";
            lblSubtitle.Font = new Font("Segoe UI", 9.5F, FontStyle.Regular);
            lblSubtitle.ForeColor = Color.FromArgb(180, 185, 195);
            lblSubtitle.Location = new Point(24, 48);
            lblSubtitle.AutoSize = true;
            pnlHeader.Controls.Add(lblSubtitle);

            this.Controls.Add(pnlHeader);

            // Discord Branch Selection
            Label lblBranch = new Label();
            lblBranch.Text = "Discord Version / Pfad:";
            lblBranch.Location = new Point(24, 100);
            lblBranch.AutoSize = true;
            lblBranch.ForeColor = Color.FromArgb(219, 222, 225);
            this.Controls.Add(lblBranch);

            comboDiscordBranch = new ComboBox();
            comboDiscordBranch.DropDownStyle = ComboBoxStyle.DropDownList;
            comboDiscordBranch.Location = new Point(24, 122);
            comboDiscordBranch.Width = 475;
            comboDiscordBranch.BackColor = Color.FromArgb(43, 45, 49);
            comboDiscordBranch.ForeColor = Color.White;
            comboDiscordBranch.FlatStyle = FlatStyle.Flat;
            this.Controls.Add(comboDiscordBranch);

            // Action Buttons
            btnInstall = new Button();
            btnInstall.Text = "⚡ Qualcord in Discord Installieren";
            btnInstall.Location = new Point(24, 160);
            btnInstall.Size = new Size(310, 42);
            btnInstall.BackColor = Color.FromArgb(88, 101, 242);
            btnInstall.ForeColor = Color.White;
            btnInstall.Font = new Font("Segoe UI", 10.5F, FontStyle.Bold);
            btnInstall.FlatStyle = FlatStyle.Flat;
            btnInstall.FlatAppearance.BorderSize = 0;
            btnInstall.Cursor = Cursors.Hand;
            btnInstall.Click += BtnInstall_Click;
            this.Controls.Add(btnInstall);

            btnUninstall = new Button();
            btnUninstall.Text = "Deinstallieren";
            btnUninstall.Location = new Point(345, 160);
            btnUninstall.Size = new Size(154, 42);
            btnUninstall.BackColor = Color.FromArgb(59, 62, 69);
            btnUninstall.ForeColor = Color.FromArgb(240, 71, 71);
            btnUninstall.Font = new Font("Segoe UI", 9.5F, FontStyle.Bold);
            btnUninstall.FlatStyle = FlatStyle.Flat;
            btnUninstall.FlatAppearance.BorderSize = 0;
            btnUninstall.Cursor = Cursors.Hand;
            btnUninstall.Click += BtnUninstall_Click;
            this.Controls.Add(btnUninstall);

            // Auto-Start Checkbox
            chkStartDiscord = new CheckBox();
            chkStartDiscord.Text = "Discord nach Installation automatisch starten";
            chkStartDiscord.Location = new Point(24, 212);
            chkStartDiscord.AutoSize = true;
            chkStartDiscord.Checked = true;
            chkStartDiscord.ForeColor = Color.FromArgb(180, 185, 195);
            this.Controls.Add(chkStartDiscord);

            // Log box
            txtLog = new RichTextBox();
            txtLog.Location = new Point(24, 242);
            txtLog.Size = new Size(475, 140);
            txtLog.BackColor = Color.FromArgb(17, 18, 20);
            txtLog.ForeColor = Color.FromArgb(219, 222, 225);
            txtLog.Font = new Font("Consolas", 8.5F);
            txtLog.BorderStyle = BorderStyle.None;
            txtLog.ReadOnly = true;
            this.Controls.Add(txtLog);

            // Progress bar
            progressBar = new ProgressBar();
            progressBar.Location = new Point(24, 390);
            progressBar.Size = new Size(475, 12);
            progressBar.Style = ProgressBarStyle.Continuous;
            this.Controls.Add(progressBar);

            // Status label
            lblStatus = new Label();
            lblStatus.Text = "Bereit zur Installation.";
            lblStatus.Location = new Point(24, 408);
            lblStatus.AutoSize = true;
            lblStatus.ForeColor = Color.FromArgb(148, 155, 164);
            lblStatus.Font = new Font("Segoe UI", 8.5F);
            this.Controls.Add(lblStatus);
        }

        private void LoadBranches()
        {
            InstallerLogic logic = new InstallerLogic();
            detectedBranches = logic.FindDiscordInstallations();

            comboDiscordBranch.Items.Clear();
            foreach (var b in detectedBranches)
            {
                comboDiscordBranch.Items.Add(b);
            }

            if (comboDiscordBranch.Items.Count > 0)
            {
                comboDiscordBranch.SelectedIndex = 0;
                Log("Gefundene Discord Installation: " + detectedBranches[0].Path, Color.LightGreen);
            }
            else
            {
                Log("Keine Discord-Installation automatisch gefunden!", Color.OrangeRed);
                btnInstall.Enabled = false;
            }
        }

        private void Log(string message, Color color)
        {
            if (txtLog.InvokeRequired)
            {
                txtLog.Invoke(new Action(() => Log(message, color)));
                return;
            }

            txtLog.SelectionStart = txtLog.TextLength;
            txtLog.SelectionLength = 0;
            txtLog.SelectionColor = color;
            txtLog.AppendText(string.Format("[{0:HH:mm:ss}] {1}\n", DateTime.Now, message));
            txtLog.ScrollToCaret();
        }

        private void BtnInstall_Click(object sender, EventArgs e)
        {
            if (comboDiscordBranch.SelectedItem == null) return;

            DiscordBranch selected = (DiscordBranch)comboDiscordBranch.SelectedItem;
            bool autoStart = chkStartDiscord.Checked;

            btnInstall.Enabled = false;
            btnUninstall.Enabled = false;
            progressBar.Value = 10;
            lblStatus.Text = "Installation luft...";

            Thread t = new Thread(() =>
            {
                try
                {
                    InstallerLogic logic = new InstallerLogic();
                    logic.Install(selected, autoStart, (msg, col) => Log(msg, col));

                    this.Invoke(new Action(() =>
                    {
                        progressBar.Value = 100;
                        lblStatus.Text = "✅ Installation erfolgreich abgeschlossen!";
                        Log("🚀 Qualcord ist startklar!", Color.Lime);
                        btnInstall.Enabled = true;
                        btnUninstall.Enabled = true;
                    }));
                }
                catch (Exception ex)
                {
                    this.Invoke(new Action(() =>
                    {
                        progressBar.Value = 0;
                        lblStatus.Text = "❌ Fehler bei der Installation!";
                        Log("Fehler: " + ex.Message, Color.OrangeRed);
                        btnInstall.Enabled = true;
                        btnUninstall.Enabled = true;
                    }));
                }
            });
            t.IsBackground = true;
            t.Start();
        }

        private void BtnUninstall_Click(object sender, EventArgs e)
        {
            if (comboDiscordBranch.SelectedItem == null) return;

            DiscordBranch selected = (DiscordBranch)comboDiscordBranch.SelectedItem;

            btnInstall.Enabled = false;
            btnUninstall.Enabled = false;
            progressBar.Value = 20;
            lblStatus.Text = "Deinstallation luft...";

            Thread t = new Thread(() =>
            {
                try
                {
                    InstallerLogic logic = new InstallerLogic();
                    logic.Uninstall(selected, (msg, col) => Log(msg, col));

                    this.Invoke(new Action(() =>
                    {
                        progressBar.Value = 100;
                        lblStatus.Text = "Qualcord erfolgreich deinstalliert.";
                        Log("Discord wurde in den Originalzustand zurckgesetzt.", Color.LightGreen);
                        btnInstall.Enabled = true;
                        btnUninstall.Enabled = true;
                    }));
                }
                catch (Exception ex)
                {
                    this.Invoke(new Action(() =>
                    {
                        progressBar.Value = 0;
                        lblStatus.Text = "Fehler bei der Deinstallation!";
                        Log("Fehler: " + ex.Message, Color.OrangeRed);
                        btnInstall.Enabled = true;
                        btnUninstall.Enabled = true;
                    }));
                }
            });
            t.IsBackground = true;
            t.Start();
        }
    }

    public class InstallerLogic
    {
        public delegate void LogCallback(string message, Color color);

        public List<DiscordBranch> FindDiscordInstallations()
        {
            List<DiscordBranch> list = new List<DiscordBranch>();
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);

            CheckAndAdd(list, "Discord (Standard)", Path.Combine(localAppData, "Discord"), "Discord");
            CheckAndAdd(list, "Discord PTB", Path.Combine(localAppData, "DiscordPTB"), "DiscordPTB");
            CheckAndAdd(list, "Discord Canary", Path.Combine(localAppData, "DiscordCanary"), "DiscordCanary");
            CheckAndAdd(list, "Discord Development", Path.Combine(localAppData, "DiscordDevelopment"), "DiscordDevelopment");

            return list;
        }

        private void CheckAndAdd(List<DiscordBranch> list, string name, string dir, string procName)
        {
            if (Directory.Exists(dir))
            {
                // Verify there is an app-* folder
                string[] appDirs = Directory.GetDirectories(dir, "app-*");
                if (appDirs.Length > 0)
                {
                    Array.Sort(appDirs);
                    string latest = appDirs[appDirs.Length - 1];
                    string version = Path.GetFileName(latest);

                    DiscordBranch b = new DiscordBranch();
                    b.Name = string.Format("{0} ({1})", name, version);
                    b.Path = dir;
                    b.ProcessName = procName;
                    list.Add(b);
                }
            }
        }

        public void Install(DiscordBranch branch, bool autoRestart, LogCallback log)
        {
            if (log == null) log = (m, c) => { };

            string discordDir = branch.Path;
            string procName = branch.ProcessName;

            log("Suche neueste Discord-Version in " + discordDir, Color.LightGray);
            string[] appDirs = Directory.GetDirectories(discordDir, "app-*");
            if (appDirs.Length == 0)
                throw new Exception("Kein Discord App-Ordner (app-*) gefunden!");

            Array.Sort(appDirs);
            string latestAppDir = appDirs[appDirs.Length - 1];
            log("Verwende Discord Version: " + Path.GetFileName(latestAppDir), Color.LightGray);

            // 1. Close Discord if running
            log("Prfe laufende Discord Prozesse...", Color.LightGray);
            KillProcesses(procName);
            Thread.Sleep(800);

            // 2. Prepare Qualcord Files in %LOCALAPPDATA%\Qualcord\dist
            string qualcordDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Qualcord", "dist");
            log("Bereite Qualcord Verzeichnis vor: " + qualcordDir, Color.LightGray);
            if (!Directory.Exists(qualcordDir))
                Directory.CreateDirectory(qualcordDir);

            ExtractQualcordFiles(qualcordDir, log);

            // 3. Patch Discord resources
            string resourcesDir = Path.Combine(latestAppDir, "resources");
            if (!Directory.Exists(resourcesDir))
                throw new Exception("Discord resources Verzeichnis nicht gefunden: " + resourcesDir);

            string appAsarFile = Path.Combine(resourcesDir, "app.asar");
            string backupAsar = Path.Combine(resourcesDir, "_app.asar");

            log("Patche Discord Injection...", Color.LightGray);

            if (File.Exists(appAsarFile))
            {
                if (!File.Exists(backupAsar))
                {
                    log("Sichere Original Discord app.asar nach _app.asar...", Color.LightGray);
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

            // Write package.json and index.js
            string pkgJsonPath = Path.Combine(appAsarFile, "package.json");
            File.WriteAllText(pkgJsonPath, "{\"name\":\"discord\",\"main\":\"index.js\"}");

            string patcherJsPath = Path.Combine(qualcordDir, "patcher.js").Replace("\\", "\\\\");
            string indexJsContent = string.Format("require(\"{0}\");\n", patcherJsPath);
            string indexJsPath = Path.Combine(appAsarFile, "index.js");
            File.WriteAllText(indexJsPath, indexJsContent);

            log("Discord erfolgreich gepatcht! Qualcord Hook ist aktiv.", Color.LightGreen);

            // 4. Start Discord
            if (autoRestart)
            {
                log("Starte Discord neu...", Color.LightCyan);
                string updateExe = Path.Combine(discordDir, "Update.exe");
                if (File.Exists(updateExe))
                {
                    Process.Start(updateExe, string.Format("--processStart {0}.exe", procName));
                }
                else
                {
                    string directExe = Path.Combine(latestAppDir, procName + ".exe");
                    if (File.Exists(directExe))
                        Process.Start(directExe);
                }
            }
        }

        public void Uninstall(DiscordBranch branch, LogCallback log)
        {
            if (log == null) log = (m, c) => { };

            string discordDir = branch.Path;
            string procName = branch.ProcessName;

            log("Deinstalliere Qualcord aus " + discordDir, Color.LightGray);
            KillProcesses(procName);
            Thread.Sleep(800);

            string[] appDirs = Directory.GetDirectories(discordDir, "app-*");
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
                    }
                    catch { }
                }

                if (File.Exists(backupAsar) && !File.Exists(appAsarDir))
                {
                    File.Move(backupAsar, appAsarDir);
                    log("Originales app.asar wiederhergestellt in " + Path.GetFileName(appDir), Color.LightGreen);
                }
            }

            log("Deinstallation erfolgreich abgeschlossen.", Color.LightGreen);
        }

        private void KillProcesses(string procName)
        {
            Process[] procs = Process.GetProcessesByName(procName);
            foreach (Process p in procs)
            {
                try
                {
                    p.Kill();
                    p.WaitForExit(3000);
                }
                catch { }
            }
        }

        private void ExtractQualcordFiles(string targetDir, LogCallback log)
        {
            // 1. Try embedded zip resource
            Assembly asm = Assembly.GetExecutingAssembly();
            Stream resStream = asm.GetManifestResourceStream("QualcordDistZip");

            if (resStream != null)
            {
                log("Entpacke eingebettete Qualcord-Dateien...", Color.LightGray);
                string tempZip = Path.Combine(Path.GetTempPath(), "qualcord_embedded_" + Guid.NewGuid().ToString("N") + ".zip");
                using (FileStream fs = new FileStream(tempZip, FileMode.Create, FileAccess.Write))
                {
                    resStream.CopyTo(fs);
                }

                ExtractZipToDirectory(tempZip, targetDir);
                try { File.Delete(tempZip); } catch { }
                log("Qualcord-Dateien erfolgreich eingerichtet.", Color.LightGreen);
                return;
            }

            // 2. Try local Qualcord-dist.zip
            string exeDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
            string localZip = Path.Combine(exeDir, "Qualcord-dist.zip");
            if (File.Exists(localZip))
            {
                log("Verwende lokales Qualcord-dist.zip...", Color.LightGray);
                ExtractZipToDirectory(localZip, targetDir);
                log("Qualcord-Dateien erfolgreich eingerichtet.", Color.LightGreen);
                return;
            }

            // 3. Try local dist/desktop directory (dev environment)
            string localDevDist = Path.Combine(exeDir, "..", "dist", "desktop");
            if (Directory.Exists(localDevDist) && File.Exists(Path.Combine(localDevDist, "patcher.js")))
            {
                log("Kopiere aus lokaler Entwicklungsversion...", Color.LightGray);
                CopyDirectory(localDevDist, targetDir);
                log("Qualcord-Dateien erfolgreich kopiert.", Color.LightGreen);
                return;
            }

            // 4. Download from GitHub
            string downloadUrl = "https://raw.githubusercontent.com/quadled/QualCord-Vencord-Equidcord-Client/main/installer/Qualcord-dist.zip";
            log("Lade neueste Qualcord-Dateien von GitHub herunter...", Color.LightCyan);
            string tempDownloadedZip = Path.Combine(Path.GetTempPath(), "qualcord_download_" + Guid.NewGuid().ToString("N") + ".zip");
            using (WebClient client = new WebClient())
            {
                client.Headers.Add("User-Agent", "QualcordInstaller/1.0");
                client.DownloadFile(downloadUrl, tempDownloadedZip);
            }

            ExtractZipToDirectory(tempDownloadedZip, targetDir);
            try { File.Delete(tempDownloadedZip); } catch { }
            log("Download und Entpacken abgeschlossen.", Color.LightGreen);
        }

        private void ExtractZipToDirectory(string zipPath, string targetDir)
        {
            using (ZipArchive archive = ZipFile.OpenRead(zipPath))
            {
                foreach (ZipArchiveEntry entry in archive.Entries)
                {
                    string destinationPath = Path.Combine(targetDir, entry.FullName);
                    string destDir = Path.GetDirectoryName(destinationPath);
                    if (!Directory.Exists(destDir))
                        Directory.CreateDirectory(destDir);

                    if (!string.IsNullOrEmpty(entry.Name))
                    {
                        entry.ExtractToFile(destinationPath, true);
                    }
                }
            }
        }

        private void CopyDirectory(string sourceDir, string destinationDir)
        {
            Directory.CreateDirectory(destinationDir);
            foreach (string file in Directory.GetFiles(sourceDir))
            {
                string destFile = Path.Combine(destinationDir, Path.GetFileName(file));
                File.Copy(file, destFile, true);
            }
            foreach (string subDir in Directory.GetDirectories(sourceDir))
            {
                string destSubDir = Path.Combine(destinationDir, Path.GetFileName(subDir));
                CopyDirectory(subDir, destSubDir);
            }
        }
    }
}

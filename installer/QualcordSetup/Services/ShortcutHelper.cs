using System;
using System.IO;

namespace CustomInstaller.Services;

public static class ShortcutHelper
{
    public static void CreateShortcut(
        string shortcutPath,
        string targetPath,
        string? workingDirectory = null,
        string? description = null,
        string? iconPath = null)
    {
        string? directory = Path.GetDirectoryName(shortcutPath);
        if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
        {
            Directory.CreateDirectory(directory);
        }

        Type? shellType = Type.GetTypeFromProgID("WScript.Shell");
        if (shellType == null) return;

        dynamic? shell = Activator.CreateInstance(shellType);
        if (shell == null) return;

        dynamic shortcut = shell.CreateShortcut(shortcutPath);
        shortcut.TargetPath = targetPath;
        shortcut.WorkingDirectory = workingDirectory ?? Path.GetDirectoryName(targetPath) ?? string.Empty;
        shortcut.Description = description ?? string.Empty;

        if (!string.IsNullOrEmpty(iconPath) && File.Exists(iconPath))
        {
            shortcut.IconLocation = iconPath;
        }
        else
        {
            shortcut.IconLocation = targetPath;
        }

        shortcut.Save();
    }

    public static void DeleteShortcut(string shortcutPath)
    {
        try
        {
            if (File.Exists(shortcutPath))
            {
                File.Delete(shortcutPath);
            }

            string? dir = Path.GetDirectoryName(shortcutPath);
            if (!string.IsNullOrEmpty(dir) && Directory.Exists(dir))
            {
                // Delete directory if empty (e.g. Start Menu folder)
                if (Directory.GetFileSystemEntries(dir).Length == 0)
                {
                    Directory.Delete(dir, false);
                }
            }
        }
        catch
        {
            // Ignore cleanup failures
        }
    }

    public static string GetCommonDesktopShortcutPath(string appName)
    {
        string desktop = Environment.GetFolderPath(Environment.SpecialFolder.CommonDesktopDirectory);
        if (string.IsNullOrEmpty(desktop) || !Directory.Exists(desktop))
        {
            desktop = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
        }
        return Path.Combine(desktop, $"{appName}.lnk");
    }

    public static string GetCommonStartMenuShortcutPath(string appName)
    {
        string programs = Environment.GetFolderPath(Environment.SpecialFolder.CommonPrograms);
        if (string.IsNullOrEmpty(programs) || !Directory.Exists(programs))
        {
            programs = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
        }
        return Path.Combine(programs, appName, $"{appName}.lnk");
    }
}

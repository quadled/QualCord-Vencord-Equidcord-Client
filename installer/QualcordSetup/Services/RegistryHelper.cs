using System;
using System.IO;
using Microsoft.Win32;
using CustomInstaller.Models;

namespace CustomInstaller.Services;

public static class RegistryHelper
{
    private const string UninstallRegistryKeyPath = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall";
    private const string RunRegistryKeyPath = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Run";

    public static void RegisterUninstall(InstallerConfig config, string installPath)
    {
        string subKeyName = config.AppName.Replace(" ", "_");
        RegistryKey? parentKey = GetWritableKey(Registry.LocalMachine, UninstallRegistryKeyPath) 
                              ?? GetWritableKey(Registry.CurrentUser, UninstallRegistryKeyPath);

        if (parentKey == null) return;

        using (parentKey)
        {
            using RegistryKey appKey = parentKey.CreateSubKey(subKeyName);
            string exePath = Path.Combine(installPath, config.ExecutableName);
            string uninstallerExe = Path.Combine(installPath, "Setup.exe");

            appKey.SetValue("DisplayName", config.AppName);
            appKey.SetValue("DisplayVersion", config.AppVersion);
            appKey.SetValue("Publisher", config.Publisher);
            appKey.SetValue("InstallLocation", installPath);
            appKey.SetValue("UninstallString", $"\"{uninstallerExe}\" --uninstall");
            appKey.SetValue("QuietUninstallString", $"\"{uninstallerExe}\" --uninstall --silent");

            if (File.Exists(exePath))
            {
                appKey.SetValue("DisplayIcon", exePath);
            }
            else if (File.Exists(uninstallerExe))
            {
                appKey.SetValue("DisplayIcon", uninstallerExe);
            }

            // Size in KB
            int estimatedKb = (int)(config.EstimatedSizeMB * 1024);
            appKey.SetValue("EstimatedSize", estimatedKb, RegistryValueKind.DWord);
            appKey.SetValue("NoModify", 1, RegistryValueKind.DWord);
            appKey.SetValue("NoRepair", 1, RegistryValueKind.DWord);
            appKey.SetValue("InstallDate", DateTime.Now.ToString("yyyyMMdd"));
        }
    }

    public static void UnregisterUninstall(string appName)
    {
        string subKeyName = appName.Replace(" ", "_");

        TryDeleteSubKey(Registry.LocalMachine, UninstallRegistryKeyPath, subKeyName);
        TryDeleteSubKey(Registry.CurrentUser, UninstallRegistryKeyPath, subKeyName);
    }

    public static void RegisterAutostart(string appName, string executablePath)
    {
        RegistryKey? runKey = GetWritableKey(Registry.LocalMachine, RunRegistryKeyPath)
                           ?? GetWritableKey(Registry.CurrentUser, RunRegistryKeyPath);

        if (runKey == null) return;

        using (runKey)
        {
            runKey.SetValue(appName, $"\"{executablePath}\"");
        }
    }

    public static void UnregisterAutostart(string appName)
    {
        TryDeleteValue(Registry.LocalMachine, RunRegistryKeyPath, appName);
        TryDeleteValue(Registry.CurrentUser, RunRegistryKeyPath, appName);
    }

    private static RegistryKey? GetWritableKey(RegistryKey root, string subPath)
    {
        try
        {
            return root.OpenSubKey(subPath, true);
        }
        catch
        {
            return null;
        }
    }

    private static void TryDeleteSubKey(RegistryKey root, string parentPath, string subKey)
    {
        try
        {
            using RegistryKey? parent = root.OpenSubKey(parentPath, true);
            parent?.DeleteSubKeyTree(subKey, false);
        }
        catch
        {
            // Ignore if key does not exist or access denied
        }
    }

    private static void TryDeleteValue(RegistryKey root, string parentPath, string valueName)
    {
        try
        {
            using RegistryKey? parent = root.OpenSubKey(parentPath, true);
            parent?.DeleteValue(valueName, false);
        }
        catch
        {
            // Ignore if value does not exist
        }
    }
}

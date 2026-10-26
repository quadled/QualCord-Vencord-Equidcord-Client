using System;
using System.IO;
using System.Text.Json;

namespace CustomInstaller.Models;

public class InstallerConfig
{
    public string AppName { get; set; } = "Qualcord";
    public string Publisher { get; set; } = "Qualcord Community";
    public string AppVersion { get; set; } = "1.0.30";
    public string ExecutableName { get; set; } = "Discord.exe";
    public string Description { get; set; } = "Moderne Discord-Erweiterung mit Quest-Automatisierung, personalisierten Themes, unbegrenzten Plugins und Live Plugin Studio.";
    public string AccentColorHex { get; set; } = "#5865F2";
    public double EstimatedSizeMB { get; set; } = 15.0;

    public bool DefaultLaunchOnStartup { get; set; } = true;
    public bool DefaultInstallGit { get; set; } = true;

    public static InstallerConfig Load()
    {
        var config = new InstallerConfig();
        string? jsonContent = null;
        
        string baseDir = AppDomain.CurrentDomain.BaseDirectory;
        string configJsonPath = Path.Combine(baseDir, "installer-config.json");

        if (File.Exists(configJsonPath))
        {
            try
            {
                jsonContent = File.ReadAllText(configJsonPath);
            }
            catch { }
        }

        if (string.IsNullOrEmpty(jsonContent))
        {
            try
            {
                var assembly = System.Reflection.Assembly.GetExecutingAssembly();
                using var stream = assembly.GetManifestResourceStream("CustomInstaller.installer-config.json");
                if (stream != null)
                {
                    using var reader = new StreamReader(stream);
                    jsonContent = reader.ReadToEnd();
                }
            }
            catch { }
        }

        if (!string.IsNullOrEmpty(jsonContent))
        {
            try
            {
                var loaded = JsonSerializer.Deserialize<InstallerConfig>(jsonContent, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                if (loaded != null)
                {
                    config = loaded;
                }
            }
            catch { }
        }

        return config;
    }
}

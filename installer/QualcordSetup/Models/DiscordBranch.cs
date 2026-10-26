namespace CustomInstaller.Models;

public class DiscordBranch
{
    public string Name { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public string ProcessName { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string AppDirPath { get; set; } = string.Empty;
    public bool IsPatched { get; set; } = false;

    public override string ToString()
    {
        string status = IsPatched ? " [Installiert]" : "";
        return string.IsNullOrEmpty(Version) ? $"{Name}{status}" : $"{Name} ({Version}){status}";
    }
}

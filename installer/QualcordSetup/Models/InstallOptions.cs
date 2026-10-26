namespace CustomInstaller.Models;

public class InstallOptions
{
    public DiscordBranch? SelectedBranch { get; set; }
    public bool AutoRestartDiscord { get; set; } = true;
    public bool InstallGit { get; set; } = true;
    public bool IsUninstall { get; set; } = false;
}

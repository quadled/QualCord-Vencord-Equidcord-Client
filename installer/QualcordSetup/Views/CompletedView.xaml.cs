using System;
using System.Windows;
using System.Windows.Controls;
using CustomInstaller.Models;

namespace CustomInstaller.Views;

public partial class CompletedView : UserControl
{
    public event EventHandler<bool>? FinishRequested;

    public CompletedView()
    {
        InitializeComponent();
    }

    public void SetDetails(InstallerConfig config, DiscordBranch branch)
    {
        TxtSummary.Text = $"{config.AppName} (v{config.AppVersion}) wurde erfolgreich in {branch.Name} integriert.";
        TxtInstalledBranch.Text = $"{branch.Name} ({branch.Version}) • Qualcord v{config.AppVersion}";
        TxtInstalledPath.Text = branch.AppDirPath;
        ChkLaunchApp.Content = $"{branch.Name} jetzt starten";
    }

    private void BtnFinish_Click(object sender, RoutedEventArgs e)
    {
        FinishRequested?.Invoke(this, ChkLaunchApp.IsChecked == true);
    }
}

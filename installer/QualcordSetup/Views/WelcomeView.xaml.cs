using System;
using System.Windows;
using System.Windows.Controls;
using CustomInstaller.Models;

namespace CustomInstaller.Views;

public partial class WelcomeView : UserControl
{
    public event EventHandler? ExpressInstallRequested;
    public event EventHandler? CustomOptionsRequested;
    public event EventHandler? UninstallRequested;

    public WelcomeView()
    {
        InitializeComponent();
    }

    public void SetConfig(InstallerConfig config)
    {
        TxtAppName.Text = config.AppName;
        TxtVersion.Text = $"Version {config.AppVersion}";
        TxtPublisher.Text = $"bereitgestellt von {config.Publisher}";
        if (!string.IsNullOrWhiteSpace(config.Description))
        {
            TxtDescription.Text = config.Description;
        }
    }

    public void SetDetectedBranch(DiscordBranch? branch)
    {
        if (branch != null)
        {
            string status = branch.IsPatched ? " (Bereits installiert)" : " (Bereit)";
            TxtDetectedDiscord.Text = $"Erkannte Discord-Installation: {branch.Name} [{branch.Version}]{status}";
            BtnExpress.IsEnabled = true;
            BtnUninstall.Visibility = branch.IsPatched ? Visibility.Visible : Visibility.Collapsed;
            if (branch.IsPatched)
            {
                BtnExpress.Content = "⚡ Qualcord aktualisieren";
            }
            else
            {
                BtnExpress.Content = "⚡ In Discord installieren";
            }
        }
        else
        {
            TxtDetectedDiscord.Text = "Keine Discord-Installation automatisch gefunden!";
            BtnExpress.IsEnabled = false;
            BtnUninstall.Visibility = Visibility.Collapsed;
        }
    }

    private void BtnExpress_Click(object sender, RoutedEventArgs e)
    {
        ExpressInstallRequested?.Invoke(this, EventArgs.Empty);
    }

    private void BtnCustom_Click(object sender, RoutedEventArgs e)
    {
        CustomOptionsRequested?.Invoke(this, EventArgs.Empty);
    }

    private void BtnUninstall_Click(object sender, RoutedEventArgs e)
    {
        UninstallRequested?.Invoke(this, EventArgs.Empty);
    }
}

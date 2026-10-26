using System;
using System.Windows;
using System.Windows.Controls;
using CustomInstaller.Models;

namespace CustomInstaller.Views;

public partial class UninstallView : UserControl
{
    public event EventHandler? CancelRequested;
    public event EventHandler? StartUninstallRequested;
    public event EventHandler? CloseRequested;

    public UninstallView()
    {
        InitializeComponent();
    }

    public void SetInfo(InstallerConfig config, DiscordBranch branch)
    {
        TxtUninstallTitle.Text = $"{config.AppName} aus {branch.Name} entfernen";
        TxtUninstallSubtitle.Text = $"Möchten Sie Qualcord wirklich aus {branch.Name} ({branch.Version}) entfernen? Die Originaldateien von Discord werden vollständig wiederhergestellt.";
        TxtUninstallPath.Text = branch.AppDirPath;
    }

    public void ShowProgress()
    {
        PanelPrompt.Visibility = Visibility.Collapsed;
        GridPromptButtons.Visibility = Visibility.Collapsed;
        PanelProgress.Visibility = Visibility.Visible;
    }

    public void UpdateProgress(int percent, string status)
    {
        Dispatcher.Invoke(() =>
        {
            ProgressUninstall.Value = percent;
            TxtPercent.Text = $"{percent} %";
            TxtStatus.Text = status;
        });
    }

    public void ShowFinished()
    {
        Dispatcher.Invoke(() =>
        {
            PanelProgress.Visibility = Visibility.Collapsed;
            PanelFinished.Visibility = Visibility.Visible;
            BtnClose.Visibility = Visibility.Visible;
        });
    }

    private void BtnCancel_Click(object sender, RoutedEventArgs e)
    {
        CancelRequested?.Invoke(this, EventArgs.Empty);
    }

    private void BtnConfirmUninstall_Click(object sender, RoutedEventArgs e)
    {
        StartUninstallRequested?.Invoke(this, EventArgs.Empty);
    }

    private void BtnClose_Click(object sender, RoutedEventArgs e)
    {
        CloseRequested?.Invoke(this, EventArgs.Empty);
    }
}

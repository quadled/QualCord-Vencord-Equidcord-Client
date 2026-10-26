using System;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;
using CustomInstaller.Models;

namespace CustomInstaller.Views;

public partial class OptionsView : UserControl
{
    public event EventHandler? BackRequested;
    public event EventHandler<InstallOptions>? InstallRequested;
    public event EventHandler<DiscordBranch>? UninstallBranchRequested;

    private List<DiscordBranch> _branches = new();
    private bool _isGitInstalled = false;

    public OptionsView()
    {
        InitializeComponent();
    }

    public void SetBranches(List<DiscordBranch> branches, bool isGitInstalled)
    {
        _branches = branches;
        _isGitInstalled = isGitInstalled;

        CmbDiscordBranches.Items.Clear();
        foreach (var b in _branches)
        {
            CmbDiscordBranches.Items.Add(b);
        }

        if (_branches.Count > 0)
        {
            CmbDiscordBranches.SelectedIndex = 0;
            BtnInstall.IsEnabled = true;
        }
        else
        {
            TxtDiscordPath.Text = "Keine Discord-Installation gefunden!";
            TxtPatchStatus.Text = "Installation nicht möglich";
            BtnInstall.IsEnabled = false;
        }

        if (_isGitInstalled)
        {
            ChkInstallGit.IsChecked = false;
            ChkInstallGit.IsEnabled = false;
            TxtGitStatus.Text = "Git für Windows ist bereits auf dem System vorhanden (OK).";
            TxtGitStatus.Foreground = (System.Windows.Media.Brush)FindResource("SuccessBrush");
        }
        else
        {
            ChkInstallGit.IsChecked = true;
            ChkInstallGit.IsEnabled = true;
            TxtGitStatus.Text = "Git ist noch nicht installiert. Wird automatisch eingerichtet.";
            TxtGitStatus.Foreground = (System.Windows.Media.Brush)FindResource("TextSecondaryBrush");
        }
    }

    private void CmbDiscordBranches_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        if (CmbDiscordBranches.SelectedItem is DiscordBranch branch)
        {
            TxtDiscordPath.Text = $"Pfad: {branch.AppDirPath}";
            if (branch.IsPatched)
            {
                TxtPatchStatus.Text = "Status: Qualcord ist in dieser Version bereits installiert";
                TxtPatchStatus.Foreground = (System.Windows.Media.Brush)FindResource("AccentBrush");
                BtnInstall.Content = "⚡ Qualcord aktualisieren";
                BtnUninstallBranch.Visibility = Visibility.Visible;
            }
            else
            {
                TxtPatchStatus.Text = "Status: Bereit zur Installation";
                TxtPatchStatus.Foreground = (System.Windows.Media.Brush)FindResource("SuccessBrush");
                BtnInstall.Content = "⚡ Qualcord installieren";
                BtnUninstallBranch.Visibility = Visibility.Collapsed;
            }
        }
    }

    private void BtnBack_Click(object sender, RoutedEventArgs e)
    {
        BackRequested?.Invoke(this, EventArgs.Empty);
    }

    private void BtnInstall_Click(object sender, RoutedEventArgs e)
    {
        if (CmbDiscordBranches.SelectedItem is DiscordBranch branch)
        {
            var options = new InstallOptions
            {
                SelectedBranch = branch,
                AutoRestartDiscord = ChkStartDiscord.IsChecked == true,
                InstallGit = ChkInstallGit.IsChecked == true
            };
            InstallRequested?.Invoke(this, options);
        }
    }

    private void BtnUninstallBranch_Click(object sender, RoutedEventArgs e)
    {
        if (CmbDiscordBranches.SelectedItem is DiscordBranch branch)
        {
            UninstallBranchRequested?.Invoke(this, branch);
        }
    }
}

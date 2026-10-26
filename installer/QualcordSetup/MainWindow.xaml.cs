using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Input;
using CustomInstaller.Models;
using CustomInstaller.Services;

namespace CustomInstaller;

public partial class MainWindow : Window
{
    private readonly InstallerConfig _config;
    private readonly InstallService _installService;
    private List<DiscordBranch> _branches = new();
    private DiscordBranch? _currentBranch;
    private CancellationTokenSource? _cts;
    private bool _isBusy = false;

    public MainWindow()
    {
        InitializeComponent();

        _config = InstallerConfig.Load();
        _installService = new InstallService();

        TxtWindowTitle.Text = $"Setup – {_config.AppName} Client";

        // Configure views
        ViewWelcome.SetConfig(_config);

        // Bind events
        ViewWelcome.ExpressInstallRequested += OnExpressInstallRequested;
        ViewWelcome.CustomOptionsRequested += (s, e) => SwitchToView(ViewOptions);
        ViewWelcome.UninstallRequested += (s, e) =>
        {
            if (_branches.Count > 0)
            {
                _currentBranch = _branches[0];
                ViewUninstall.SetInfo(_config, _currentBranch);
                SwitchToView(ViewUninstall);
            }
        };

        ViewOptions.BackRequested += (s, e) => SwitchToView(ViewWelcome);
        ViewOptions.InstallRequested += OnOptionsInstallRequested;
        ViewOptions.UninstallBranchRequested += (s, branch) =>
        {
            _currentBranch = branch;
            ViewUninstall.SetInfo(_config, branch);
            SwitchToView(ViewUninstall);
        };

        ViewCompleted.FinishRequested += OnFinishRequested;

        ViewUninstall.CancelRequested += (s, e) => SwitchToView(ViewWelcome);
        ViewUninstall.StartUninstallRequested += OnStartUninstallRequested;
        ViewUninstall.CloseRequested += (s, e) => Close();

        Loaded += MainWindow_Loaded;
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        _branches = _installService.FindDiscordInstallations();
        bool isGitInstalled = _installService.IsGitInstalled();

        string[] args = Environment.GetCommandLineArgs();
        bool isSilent = args.Any(a => a.Equals("--silent", StringComparison.OrdinalIgnoreCase) || a.Equals("/silent", StringComparison.OrdinalIgnoreCase) || a.Equals("-silent", StringComparison.OrdinalIgnoreCase));
        bool isUninstall = args.Any(a => a.Equals("--uninstall", StringComparison.OrdinalIgnoreCase) || a.Equals("/uninstall", StringComparison.OrdinalIgnoreCase) || a.Equals("-uninstall", StringComparison.OrdinalIgnoreCase));

        if (isSilent)
        {
            if (_branches.Count > 0)
            {
                var target = _branches[0];
                var opt = new InstallOptions
                {
                    SelectedBranch = target,
                    AutoRestartDiscord = true,
                    InstallGit = true
                };

                var dummyProg = new Progress<(int, string)>();
                if (isUninstall)
                {
                    await _installService.UninstallAsync(target, dummyProg, _ => { }, CancellationToken.None);
                }
                else
                {
                    await _installService.InstallAsync(target, opt, dummyProg, _ => { }, CancellationToken.None);
                }
            }
            Close();
            return;
        }

        ViewWelcome.SetDetectedBranch(_branches.FirstOrDefault());
        ViewOptions.SetBranches(_branches, isGitInstalled);

        if (isUninstall && _branches.Count > 0)
        {
            _currentBranch = _branches[0];
            ViewUninstall.SetInfo(_config, _currentBranch);
            SwitchToView(ViewUninstall);
        }
        else
        {
            SwitchToView(ViewWelcome);
        }
    }

    private void SwitchToView(UIElement view)
    {
        ViewWelcome.Visibility = Visibility.Collapsed;
        ViewOptions.Visibility = Visibility.Collapsed;
        ViewProgress.Visibility = Visibility.Collapsed;
        ViewCompleted.Visibility = Visibility.Collapsed;
        ViewUninstall.Visibility = Visibility.Collapsed;

        view.Visibility = Visibility.Visible;
    }

    private async void OnExpressInstallRequested(object? sender, EventArgs e)
    {
        if (_branches.Count == 0) return;

        var target = _branches[0];
        var options = new InstallOptions
        {
            SelectedBranch = target,
            AutoRestartDiscord = true,
            InstallGit = true
        };

        await StartInstallationAsync(options);
    }

    private async void OnOptionsInstallRequested(object? sender, InstallOptions options)
    {
        await StartInstallationAsync(options);
    }

    private async Task StartInstallationAsync(InstallOptions options)
    {
        if (options.SelectedBranch == null) return;
        _currentBranch = options.SelectedBranch;

        _isBusy = true;
        _cts = new CancellationTokenSource();

        ViewProgress.Reset();
        ViewProgress.SetContext(
            $"Installiere {_config.AppName}...",
            $"Integriere Qualcord in {_currentBranch.Name} ({_currentBranch.Version}).");
        SwitchToView(ViewProgress);

        var progress = new Progress<(int percent, string status)>(tuple =>
        {
            ViewProgress.UpdateProgress(tuple.percent, tuple.status);
        });

        try
        {
            await _installService.InstallAsync(
                _currentBranch,
                options,
                progress,
                msg => ViewProgress.Log(msg),
                _cts.Token);

            _isBusy = false;
            ViewCompleted.SetDetails(_config, _currentBranch);
            SwitchToView(ViewCompleted);
        }
        catch (OperationCanceledException)
        {
            _isBusy = false;
            MessageBox.Show(
                "Die Installation wurde abgebrochen.",
                "Abgebrochen",
                MessageBoxButton.OK,
                MessageBoxImage.Information);
            SwitchToView(ViewWelcome);
        }
        catch (Exception ex)
        {
            _isBusy = false;
            MessageBox.Show(
                $"Fehler bei der Installation:\n\n{ex.Message}",
                "Installationsfehler",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
            SwitchToView(ViewOptions);
        }
    }

    private async void OnStartUninstallRequested(object? sender, EventArgs e)
    {
        if (_currentBranch == null) return;

        _isBusy = true;
        _cts = new CancellationTokenSource();
        ViewUninstall.ShowProgress();

        var progress = new Progress<(int percent, string status)>(tuple =>
        {
            ViewUninstall.UpdateProgress(tuple.percent, tuple.status);
        });

        try
        {
            await _installService.UninstallAsync(
                _currentBranch,
                progress,
                msg => { },
                _cts.Token);

            _isBusy = false;
            ViewUninstall.ShowFinished();
        }
        catch (Exception ex)
        {
            _isBusy = false;
            MessageBox.Show(
                $"Fehler bei der Deinstallation:\n\n{ex.Message}",
                "Deinstallationsfehler",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
        }
    }

    private void OnFinishRequested(object? sender, bool launchApp)
    {
        if (launchApp && _currentBranch != null)
        {
            try
            {
                _installService.LaunchDiscord(_currentBranch);
            }
            catch { }
        }

        Close();
    }

    private void TitleBar_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        if (e.LeftButton == MouseButtonState.Pressed)
        {
            DragMove();
        }
    }

    private void BtnMinimize_Click(object sender, RoutedEventArgs e)
    {
        WindowState = WindowState.Minimized;
    }

    private void BtnClose_Click(object sender, RoutedEventArgs e)
    {
        if (_isBusy)
        {
            var result = MessageBox.Show(
                "Ein Vorgang wird aktuell ausgeführt. Möchten Sie diesen Vorgang wirklich abbrechen und das Setup beenden?",
                "Setup beenden",
                MessageBoxButton.YesNo,
                MessageBoxImage.Question);

            if (result != MessageBoxResult.Yes)
            {
                return;
            }

            _cts?.Cancel();
        }

        Close();
    }
}

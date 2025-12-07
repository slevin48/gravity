function gravity_flight_dashboard(csvFile)
%GRAVITY_FLIGHT_DASHBOARD Replay Gravity flight CSV data inside MATLAB.
%   GRAVITY_FLIGHT_DASHBOARD(csvFile) loads the exported CSV file from the
%   Gravity recorder UI and opens an interactive dashboard to replay the
%   flight. When csvFile is omitted, a file picker is shown.
%
%   Controls:
%     • Play/Pause toggles animation playback
%     • Reset jumps to the beginning of the flight
%     • Slider scrubs through the flight timeline
%
%   Example:
%       gravity_flight_dashboard('gravity-flight-2025-12-07T00-31-32.681Z.csv')

arguments
  csvFile (1, 1) string = ""
end

if csvFile == ""
  [fileName, filePath] = uigetfile('*.csv', 'Select Gravity flight CSV');
  if isequal(fileName, 0)
    return;
  end
  csvFile = string(fullfile(filePath, fileName));
end

if ~isfile(csvFile)
  error('gravity_flight_dashboard:fileNotFound', ...
        'Could not find the CSV file: %s', csvFile);
end

data = readtable(csvFile);
requiredVars = ["time_s", "pos_x", "pos_y", "pos_z", ...
  "speed_kmh", "altitude_m", "pitch_deg", "roll_deg"];

if ~all(ismember(requiredVars, data.Properties.VariableNames))
  missing = requiredVars(~ismember(requiredVars, data.Properties.VariableNames));
  error('gravity_flight_dashboard:missingColumns', ...
        'CSV is missing required columns: %s', strjoin(missing, ', '));
end

timeRaw = data.time_s;
time = timeRaw - timeRaw(1); % normalize start time to 0 s
position = [data.pos_x, data.pos_y, data.pos_z];
speed = data.speed_kmh;
altitude = data.altitude_m;
pitch = data.pitch_deg;
roll = data.roll_deg;

numSamples = numel(time);
if numSamples < 2
  error('gravity_flight_dashboard:notEnoughSamples', ...
        'Need at least two samples to build a replay (found %d).', numSamples);
end

durationSeconds = time(end);

% UI layout ---------------------------------------------------------------
fig = uifigure('Name', 'Gravity Flight Replay', ...
  'Position', [100 100 1100 720]);

mainLayout = uigridlayout(fig, [3, 2]);
mainLayout.RowHeight = {'3x', 60, '2x'};
mainLayout.ColumnWidth = {'3x', '1x'};
mainLayout.Padding = [12 12 12 12];
mainLayout.RowSpacing = 8;
mainLayout.ColumnSpacing = 12;

pathAxes = uiaxes(mainLayout);
pathAxes.Layout.Row = 1;
pathAxes.Layout.Column = [1 2];
grid(pathAxes, 'on');
hold(pathAxes, 'on');
pathAxes.Title.String = '3D Trajectory';
pathAxes.XLabel.String = 'X (m)';
pathAxes.YLabel.String = 'Y (m)';
pathAxes.ZLabel.String = 'Z (m)';
pathAxes.DataAspectRatio = [1 1 0.6];

plot3(pathAxes, position(:, 1), position(:, 2), position(:, 3), ...
  'Color', [0.7 0.7 0.7], 'LineWidth', 1.25);
craftMarker = plot3(pathAxes, position(1, 1), position(1, 2), position(1, 3), ...
  'o', 'MarkerFaceColor', [0.95 0.3 0.2], 'MarkerEdgeColor', 'k', ...
  'MarkerSize', 8);

headingArrow = quiver3(pathAxes, position(1, 1), position(1, 2), position(1, 3), ...
  0, 0, 0, 0, 'LineWidth', 2, 'Color', [0.9 0.4 0.1], ...
  'MaxHeadSize', 2);

% Altitude vs Time plot
altAxes = uiaxes(mainLayout);
altAxes.Layout.Row = 3;
altAxes.Layout.Column = 1;
grid(altAxes, 'on');
hold(altAxes, 'on');
altAxes.Title.String = 'Altitude';
altAxes.XLabel.String = 'Time (s)';
altAxes.YLabel.String = 'Altitude (m)';

plot(altAxes, time, altitude, 'Color', [0.2 0.6 0.9], 'LineWidth', 1.8);
altMarker = plot(altAxes, time(1), altitude(1), 'o', ...
  'MarkerSize', 8, 'MarkerFaceColor', [0.95 0.3 0.2], 'MarkerEdgeColor', 'k');

% Controls row ------------------------------------------------------------
timelineSlider = uislider(mainLayout);
timelineSlider.Layout.Row = 2;
timelineSlider.Layout.Column = 1;
timelineSlider.Limits = [time(1) time(end)];
timelineSlider.Value = time(1);
timelineSlider.MajorTicks = linspace(time(1), time(end), min(6, numSamples));
timelineSlider.MinorTicks = [];

controlsPanel = uipanel(mainLayout, 'Title', 'Playback');
controlsPanel.Layout.Row = 2;
controlsPanel.Layout.Column = 2;
controlsPanel.FontWeight = 'bold';
controlsLayout = uigridlayout(controlsPanel, [2, 2]);
controlsLayout.RowHeight = [30 30];
controlsLayout.ColumnWidth = {'1x', '1x'};
controlsLayout.RowSpacing = 6;
controlsLayout.Padding = [10 5 10 8];

playButton = uibutton(controlsLayout, 'Text', 'Play', ...
  'ButtonPushedFcn', @(btn, ~) togglePlayback());
playButton.Layout.Row = 1;
playButton.Layout.Column = 1;

resetButton = uibutton(controlsLayout, 'Text', 'Reset', ...
  'ButtonPushedFcn', @(btn, ~) resetPlayback());
resetButton.Layout.Row = 1;
resetButton.Layout.Column = 2;

loadButton = uibutton(controlsLayout, 'Text', 'Open CSV...', ...
  'ButtonPushedFcn', @(btn, ~) openNewCsv());
loadButton.Layout.Row = 2;
loadButton.Layout.Column = [1 2];

% Metrics panel -----------------------------------------------------------
metricsPanel = uipanel(mainLayout, 'Title', 'Flight Data');
metricsPanel.Layout.Row = 3;
metricsPanel.Layout.Column = 2;
metricsLayout = uigridlayout(metricsPanel, [6, 1]);
metricsLayout.RowHeight = repmat({24}, 1, 6);
metricsLayout.Padding = [10 5 10 10];

fileLabel = uilabel(metricsLayout, 'Text', sprintf('File: %s', csvFile), ...
  'Interpreter', 'none');
fileLabel.FontWeight = 'bold';

durationLabel = uilabel(metricsLayout, ...
  'Text', sprintf('Duration: %.1f s (%d samples)', durationSeconds, numSamples));

timeLabel = uilabel(metricsLayout, ...
  'Text', sprintf('Time: %.2f s', time(1)));
speedLabel = uilabel(metricsLayout, ...
  'Text', sprintf('Speed: %.1f km/h', speed(1)));
altitudeLabel = uilabel(metricsLayout, ...
  'Text', sprintf('Altitude: %.1f m', altitude(1)));
attitudeLabel = uilabel(metricsLayout, ...
  'Text', sprintf('Pitch/Roll: %.1f° / %.1f°', pitch(1), roll(1)));

% Playback state ----------------------------------------------------------
state.currentIdx = 1;
state.isPlaying = false;
suppressSliderEvents = false;

playTimer = timer('ExecutionMode', 'fixedSpacing', ...
  'Period', 0.03, 'TimerFcn', @advanceFrame, ...
  'StartDelay', 0.1);

fig.CloseRequestFcn = @(src, evt) closeDashboard();

timelineSlider.ValueChangingFcn = @(src, evt) sliderChanged(evt.Value);
timelineSlider.ValueChangedFcn = @(src, evt) sliderChanged(evt.Value);

updateFrame(1);

% ---------------- Nested helper functions -----------------
  function sliderChanged(value)
    if suppressSliderEvents
      return;
    end
    stopPlayback();
    idx = timeToIndex(value);
    updateFrame(idx);
  end

  function idx = timeToIndex(timeValue)
    [~, idx] = min(abs(time - timeValue));
  end

  function togglePlayback()
    if state.isPlaying
      stopPlayback();
    else
      startPlayback();
    end
  end

  function startPlayback()
    if state.isPlaying
      return;
    end
    state.isPlaying = true;
    playButton.Text = 'Pause';
    if strcmp(playTimer.Running, "off")
      start(playTimer);
    end
  end

  function stopPlayback()
    if ~state.isPlaying
      return;
    end
    state.isPlaying = false;
    playButton.Text = 'Play';
    if strcmp(playTimer.Running, "on")
      stop(playTimer);
    end
  end

  function resetPlayback()
    stopPlayback();
    updateFrame(1);
  end

  function advanceFrame(~, ~)
    if state.currentIdx >= numSamples
      stopPlayback();
      return;
    end
    updateFrame(state.currentIdx + 1);
  end

  function updateFrame(newIdx)
    newIdx = max(1, min(numSamples, newIdx));
    state.currentIdx = newIdx;

    pos = position(newIdx, :);
    set(craftMarker, 'XData', pos(1), 'YData', pos(2), 'ZData', pos(3));

    arrow = computeHeadingVector(newIdx) * 50;
    set(headingArrow, 'XData', pos(1), 'YData', pos(2), 'ZData', pos(3), ...
      'UData', arrow(1), 'VData', arrow(2), 'WData', arrow(3));

    set(altMarker, 'XData', time(newIdx), 'YData', altitude(newIdx));

    suppressSliderEvents = true;
    timelineSlider.Value = time(newIdx);
    suppressSliderEvents = false;

    timeLabel.Text = sprintf('Time: %.2f s', time(newIdx));
    speedLabel.Text = sprintf('Speed: %.1f km/h', speed(newIdx));
    altitudeLabel.Text = sprintf('Altitude: %.1f m', altitude(newIdx));
    attitudeLabel.Text = sprintf('Pitch/Roll: %.1f° / %.1f°', ...
      pitch(newIdx), roll(newIdx));
  end

  function vec = computeHeadingVector(idx)
    prevIdx = max(1, idx - 1);
    nextIdx = min(numSamples, idx + 1);
    vec = position(nextIdx, :) - position(prevIdx, :);
    normVal = norm(vec);
    if normVal < 1e-3
      vec = [0 0 1];
      return;
    end
    vec = vec / normVal;
  end

  function closeDashboard()
    if strcmp(playTimer.Running, "on")
      stop(playTimer);
    end
    delete(playTimer);
    delete(fig);
  end

  function openNewCsv()
    [newFile, newPath] = uigetfile('*.csv', 'Select Gravity flight CSV');
    if isequal(newFile, 0)
      return;
    end
    closeDashboard();
    gravity_flight_dashboard(fullfile(newPath, newFile));
  end
end

// LifeViewer Help
// written by Chris Rowett

(function() {
	// use strict mode
	"use strict";

	// define globals
	/* global ViewConstants ColourManager Keywords WaypointConstants DocConfig PatternManager Controller AliasManager */

	// Help singleton
	var Help = {
	};

	// draw a line of help text with up down greyed based on position
	Help.renderHelpLineUpDown = function(view, up, separator, down, text, ctx, x, y, height, startLine) {
		var result = y,
		    
		    // only change colour if not drawing shadow
		    drawingShadow = false,

		    // line number
		    lineNo = view.lineNo;

		// only render if context exists
		if (ctx) {
			// check if drawing shadow
			if (ctx.fillStyle === ViewConstants.helpShadowColour) {
				drawingShadow = true;
			}

			// check if the line is on the page
			if (lineNo >= startLine && lineNo <= (startLine + view.numHelpPerPage)) {
				// output up
				ctx.font = ViewConstants.fixedFont;

				// set colour based on whether help can scroll up
				if (!drawingShadow) {
					if ((view.displayHelp | 0) > 1) {
						ctx.fillStyle = ViewConstants.helpFontColour;
					}
					else {
						ctx.fillStyle = ViewConstants.greyFontColour;
					}
				}
				ctx.fillText(up, x, y);

				// draw the separator
				if (!drawingShadow) {
					ctx.fillStyle = ViewConstants.helpFontColour;
				}
				ctx.fillText(separator, x + ctx.measureText(up).width, y);

				// set colour based on whether help can scroll down
				if (!drawingShadow) {
					if ((view.displayHelp | 0) < view.numHelpLines - view.numHelpPerPage) {
						ctx.fillStyle = ViewConstants.helpFontColour;
					}
					else {
						ctx.fillStyle = ViewConstants.greyFontColour;
					}
				}
				ctx.fillText(down, x + ctx.measureText(up + separator).width, y);

				// draw the variable part
				if (!drawingShadow) {
					ctx.fillStyle = ViewConstants.helpFontColour;
				}
				ctx.font = ViewConstants.variableFont;
				ctx.fillText(text, x + view.tabs[0], y);

				// move the y coordinate to the next screen line
				result += height;
			}
		}

		// increment line number
		view.lineNo += 1;

		// return the next y coordinate
		return result;
	};

	// render a colour box on a line of help text
	Help.renderColourBox = function(view, red, green, blue, ctx, x, y, height, startLine) {
		// line number
		var lineNo = view.lineNo,
		    currentFill = null;

		// only render if context exists
		if (ctx) {
			// reduce height to create a 1 pixel border
			height -= 6;

			// check if the line is on the page
			if (lineNo >= startLine && lineNo <= (startLine + view.numHelpPerPage)) {
				// remember the current fill style
				currentFill = ctx.fillStyle;

				// check if drawing shadow
				if (currentFill !== ViewConstants.helpShadowColour) {
					// set the box colour
					ctx.fillStyle = "rgb(" + red + "," + green + "," + blue + ")";
				}

				// draw the box
				ctx.fillRect(x, y - (height >> 1) - 1, height, height);

				// reset the colour to the help font colour
				ctx.fillStyle = currentFill;
			}
		}
	};

	// draw a line of help text
	Help.renderHelpLine = function(view, fixed, text, ctx, x, y, height, startLine) {
		var result = y,

		    // tab index in text
		    tab = String(text).indexOf("\t"),

		    // line number
		    lineNo = view.lineNo,

		    // tab number
		    tabNo = 0;

		// only render if context exists
		if (ctx) {
			// check if the line is on the page
			if (lineNo >= startLine && lineNo <= (startLine + view.numHelpPerPage)) {
				// check if there is fixed text
				if (fixed.length) {
					ctx.font = ViewConstants.fixedFont;
					ctx.fillText(fixed, x, y);

					ctx.font = ViewConstants.variableFont;
					while (tab !== -1) {
						// draw the text up to the tab at the current tab stop
						ctx.fillText(text.substr(0, tab), x + view.tabs[tabNo], y);

						// next tab stop
						tabNo += 1;

						// check for next tab
						text = text.substr(tab + 1);
						tab = text.indexOf("\t");
					}

					// draw the line of text
					ctx.fillText(text, x + view.tabs[tabNo], y);
				}
				else {
					ctx.font = ViewConstants.variableFont;
					ctx.fillText(text, x, y);
				}

				// move the y coordinate to the next screen line
				result += height;
			}
		}

		// increment line number
		view.lineNo += 1;

		// return the next y coordinate
		return result;
	};

	// rgb direct colour as string
	Help.rgbString = function(redValue, greenValue, blueValue) {
		var colourList = ColourManager.colourList,
		    keys = Object.keys(colourList),
		    result = "    " + redValue + "\t" + greenValue + "\t" + blueValue,
		    found = false,
		    triple = null,
		    i = 0;

		// search the object for a key matching the r, g, b
		while (i < keys.length && !found) {
			// get the value at the key
			triple = colourList[keys[i]];

			// check if it matches the R G B triple
			if (triple[1] === redValue && triple[2] === greenValue && triple[3] === blueValue) {
				// add name to the result
				result += "\t" + triple[0];

				// mark found and exit loop
				found = true;
				i = keys.length;
			}
			else {
				// try next
				i += 1;
			}
		}
	
		// return the string
		return result;
	};

	// rgb object colour as string
	Help.rgbObjectString = function(object) {
		return this.rgbString(object.red, object.green, object.blue);
	};

	// return area as string
	Help.areaString = function(view) {
		var width = 0,
		    height = 0,
		    result = "";

		// check if at T=0
		if (view.engine.counter) {
			// at T>0 so check if any cells are alive
			if (view.anythingAlive) {
				// cells alive so get dimensions from bounding box
				width = view.engine.zoomBox.rightX - view.engine.zoomBox.leftX + 1;
				height = view.engine.zoomBox.topY - view.engine.zoomBox.bottomY + 1;
			}
		}
		else {
			// at T=0 so get dimensions from pattern
			width = view.patternWidth;
			height = view.patternHeight;
		}

		// check for bounded grid
		if (view.engine.boundedGridType !== -1) {
			// read bounded grid width and height
			if (view.engine.boundedGridWidth !== 0) {
				width = view.engine.boundedGridWidth;
			}
			if (view.engine.boundedGridHeight !== 0) {
				height = view.engine.boundedGridHeight;
			}
		}

		// return the area string
		result = width + " x " + height;
		return result;
	};

	// return autofit mode name
	Help.autoFitName = function(view) {
		// determine the mode
		var result = "AutoFit";
		if (view.historyFit) {
			result += " History";
		}
		if (view.state1Fit) {
			result += " State 1";
		}

		// return the mode name
		return result;
	};

	// pad a string
	Help.pad = function(string, padding) {
		// compute padding length
		var l = padding - string.length;
		var result = "";

		while (l > 0) {
			result += " ";
			l -= 1;
		}

		return result + string;
	};

	// render help text page
	Help.renderHelpText = function(view, ctx, x, y, height, helpLine) {
		var endLine = 0,
		    topY = y,
		    modeName = "Player",
		    statesName = "",
		    ruleName = "",
		    colourValue = "",
		    colourName = "",
		    themeName = "",
		    i = 0,
		    value = 0,
		    flag = false,

		    // get the current theme
		    theme = view.engine.themes[view.engine.colourTheme],

		    // get the current colour set
		    colourList = view.colourList,

		    // get the named colour list
		    cmList = ColourManager.colourList,
		    keys = Object.keys(cmList),
		    namedCol = null,

		    // get tabstops
		    tabs = view.tabs,

		    // get section array
		    sections = view.helpSections,
		    sectionNum = 0;

		// set initial line
		view.lineNo = 1;

		// title
		tabs[0] = 108;
		sections[sectionNum] = view.lineNo;
		sectionNum += 1;
		y = this.renderHelpLine(view, "", ViewConstants.versionName + " build " + ViewConstants.versionBuild + " by " + ViewConstants.versionAuthor, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// keyboard commands
		tabs[0] = 124;
		sections[sectionNum] = view.lineNo;
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Keyboard commands", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// playback controls
		sections[sectionNum] = view.lineNo;
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Playback controls:", ctx, x, y, height, helpLine);
		if (view.multiStateView) {
			y = this.renderHelpLine(view, "R", "reset", ctx, x, y, height, helpLine);
		}
		else {
			y = this.renderHelpLine(view, "Enter", "toggle play / pause", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Space", "pause / next generation", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "B", "pause / previous generation", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Tab", "pause / next step", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Shift Tab", "pause / previous step", ctx, x, y, height, helpLine);
			if (view.isInPopup) {
				y = this.renderHelpLine(view, "Esc", "close LifeViewer", ctx, x, y, height, helpLine);
			}
			else {
				y = this.renderHelpLine(view, "Esc", "pause if playing", ctx, x, y, height, helpLine);
			}
			y = this.renderHelpLine(view, "R", "reset to generation 0", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Shift R", "reset all LifeViewers to generation 0", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "-", "decrease generation speed", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "+", "increase generation speed", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Shift -", "minimum generation speed", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Shift +", "maximum generation speed", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "D", "decrease step size", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "E", "increase step size", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Shift D", "minimum step size", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Shift E", "maximum step size", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "0", "reset step and speed", ctx, x, y, height, helpLine);
			if (view.waypointsDefined) {
				if (view.loopGeneration !== -1) {
					y = this.renderHelpLine(view, "W", "toggle waypoint playback and loop", ctx, x, y, height, helpLine);
				}
				else {
					y = this.renderHelpLine(view, "W", "toggle waypoint playback", ctx, x, y, height, helpLine);
				}
				y = this.renderHelpLine(view, "Y", "move back in time", ctx, x, y, height, helpLine);
				y = this.renderHelpLine(view, "U", "move forward in time", ctx, x, y, height, helpLine);
			}
			else {
				if (view.loopGeneration !== -1) {
					y = this.renderHelpLine(view, "W", "toggle loop", ctx, x, y, height, helpLine);
				}
			}
		}
		y = this.renderHelpLine(view, "Z", "stop playback in all other LifeViewers", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift Z", "stop playback in all LifeViewers", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// camera controls
		sections[sectionNum] = view.lineNo;
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Camera controls:", ctx, x, y, height, helpLine);
		// only display navigation menu key if menu is available
		if ((view.displayHeight >= ViewConstants.minMenuHeight) || ((view.thumbnail && view.thumbOrigHeight) >= ViewConstants.minMenuHeight)) {
			y = this.renderHelpLine(view, "M", "toggle navigation menu", ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, "V", "restore saved camera position", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift V", "save current camera position", ctx, x, y, height, helpLine);

		// check if POI are present
		value = view.waypointManager.numPOIs();
		if (value > 0) {
			y = this.renderHelpLine(view, "J", "jump to next point of interest", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Shift J", "jump to previous point of interest", ctx, x, y, height, helpLine);
			if (value > 9) {
				value = 9;
			}
			for (i = 1; i <= value; i += 1) {
				y = this.renderHelpLine(view, "Alt " + String(i), "jump to POI #" + String(i), ctx, x, y, height, helpLine);
			}
		}

		y = this.renderHelpLine(view, "F", "fit pattern to display", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift F", "toggle autofit", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift H", "toggle autofit history mode", ctx, x, y, height, helpLine);
		if (view.engine.isLifeHistory) {
			y = this.renderHelpLine(view, "Shift S", "toggle autofit state 1 mode", ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, "[", "zoom out", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "]", "zoom in", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift [", "halve zoom", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift ]", "double zoom", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "1", "1x zoom", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "2", "2x zoom", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "4", "4x zoom", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "8", "8x zoom", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "6", "16x zoom", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "3", "32x zoom", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift 1", "integer zoom", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift 2", "-2x zoom", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift 4", "-4x zoom", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift 8", "-8x zoom", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift 6", "-16x zoom", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Left", "pan left", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Right", "pan right", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Up", "pan up", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Down", "pan down", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift Left", "pan north west", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift Right", "pan south east", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift Up", "pan north east", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift Down", "pan south west", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "<", "rotate left", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, ">", "rotate right", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift <", "rotate left 90 degrees", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift >", "rotate right 90 degrees", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "5", "reset angle", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// view controls, only display if not in multistate mode
		if (!view.multiStateView) {
			sections[sectionNum] = view.lineNo;
			sectionNum += 1;
			y = this.renderHelpLine(view, "", "View controls:", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Q", "increase number of layers", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "A", "decrease number of layers", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "P", "increase layer depth", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "L", "decrease layer depth", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "C", "next colour theme", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Shift C", "previous colour theme", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Alt C", "default theme", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		}

		// display controls
		sections[sectionNum] = view.lineNo;
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Display controls:", ctx, x, y, height, helpLine);
		if (!view.multiStateView) {
			y = this.renderHelpLine(view, "G", "toggle generation statistics", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Shift G", "toggle generation display mode", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Y", "toggle population graph", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Shift Y", "toggle graph lines", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "7", "decrease graph opacity", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "9", "increase graph opacity", ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, "/", "toggle hex view", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift /", "pattern default view", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "T", "toggle timing information", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift T", "toggle extended timing information", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "I", "toggle pattern and engine information", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift I", "toggle information bar", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "X", "toggle grid lines", ctx, x, y, height, helpLine);
		if (view.engine.gridLineMajor > 0) {
			y = this.renderHelpLine(view, "Shift X", "toggle major grid lines", ctx, x, y, height, helpLine);
		}
		// check if thumbnail ever on
		if (view.thumbnailEverOn) {
			y = this.renderHelpLine(view, "N", "toggle thumbnail view", ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, "S", "toggle stars", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "O", "open screenshot in separate window", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift O", "open population graph in separate window", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Control C", "copy pattern to clipboard", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// help controls
		sections[sectionNum] = view.lineNo;
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Help controls:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Up", "scroll up one line", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Down", "scroll down one line", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "PgUp", "scroll up one page", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "PgDn", "scroll down one page", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift PgUp", "scroll up one section", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift PgDn", "scroll down one section", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Home", "go to first help page", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "End", "go to last help page", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		tabs[0] = 252;
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// save script help line number
		view.scriptHelpLine = view.lineNo;
		sections[sectionNum] = view.lineNo;
		sectionNum += 1;

		// scripts
		y = this.renderHelpLine(view, "", "Scripts", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "Scripts must be embedded in pattern comments", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "Commands must be surrounded by whitespace", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "Parameter conventions:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "A|B", "either A or B", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "(A)", "A is optional", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "<1..3>", "integer range", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "<1.0..3.0>", "decimal range", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// script commands
		sections[sectionNum] = view.lineNo;
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Commands:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.scriptStartWord, "start script section", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.scriptEndWord, "end script section", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.strictWord, "enable strict validation", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.suppressWord, "suppress overwrite warning", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.autoStartWord + " (" + Keywords.offWord + ")", "start play automatically", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.hardResetWord, "always use hard reset", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.loopWord + " <1..>|" + Keywords.offWord, "loop at generation", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.stopWord + " <1..>|" + Keywords.offWord, "stop at generation", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.tWord + " <0..>", "waypoint at generation", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.pauseWord + " <0.0..>", "pause for time", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.linearWord + " " + Keywords.allWord + "|" + Keywords.xWord + "|" + Keywords.yWord + "|" + Keywords.zoomWord, "linear motion", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.bezierWord + " " + Keywords.allWord + "|" + Keywords.xWord + "|" + Keywords.yWord + "|" + Keywords.zoomWord, "bezier motion (default)", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.autoFitWord + " (" + Keywords.offWord + ")", "fit pattern to display", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.historyFitWord + " (" + Keywords.offWord + ")", "autofit uses pattern history", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.state1FitWord + " (" + Keywords.offWord + ")", "autofit only uses state 1", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.trackWord + " X Y", "camera tracking", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " X ", "horizontal speed cells/gen", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " Y ", "vertical speed cells/gen", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.trackBoxWord + " E S W N", "camera box tracking", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " E ", "east edge speed cells/gen", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " S ", "south edge speed cells/gen", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " W ", "west edge speed cells/gen", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " N ", "north edge speed cells/gen", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.trackLoopWord + " P X Y", "camera tracking with loop", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " P ", "period", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " X ", "horizontal speed cells/gen", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " Y ", "vertical speed cells/gen", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.poiWord, "define point of interest", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.poiTWord + " <0..>", "start POI at generation", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.poiResetWord, "reset generation at POI", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.poiPlayWord, "start playback at POI", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.poiStopWord, "stop playback at POI", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.poiTransWord + " <" + WaypointConstants.poiMinSpeed + ".." + WaypointConstants.poiMaxSpeed + ">", "set POI transition speed", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "<command>|ALL " + Keywords.initialWord, "use initial value for POI", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.stringDelimiter + "<string>" + Keywords.stringDelimiter, "define message", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.titleWord + " " + Keywords.stringDelimiter + "<string>" + Keywords.stringDelimiter, "set window title", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.variablePrefixSymbol + "B", "program build number", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.variablePrefixSymbol + "N", "pattern name", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.variablePrefixSymbol + "O", "pattern originator", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.variablePrefixSymbol + "R", "rule name", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.variablePrefixSymbol + "A", "rule alias", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.variablePrefixSymbol + "T", "program title", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.variablePrefixSymbol + Keywords.variablePrefixSymbol, Keywords.variablePrefixSymbol + " symbol", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.noGUIWord, "disable menus and hotkeys", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.noCopyWord, "disable pattern source copy", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.noSourceWord, "hide pattern source", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.viewOnlyWord, "disable playback", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.noHistoryWord, "disable step back", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.noReportWord, "disable stop messages", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.thumbnailWord + " (" + Keywords.offWord + ")", "start at 1/" + view.thumbnailDivisor + " size", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.thumbSizeWord + " <" + ViewConstants.minThumbSize + ".." + ViewConstants.maxThumbSize + ">", "set thumbnail divisor", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.thumbLaunchWord + " (" + Keywords.offWord + ")", "thumbnail launches viewer", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.gridWord + " (" + Keywords.offWord + ")", "display grid lines", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.gridMajorWord + " <0..16>", "set major grid line interval", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.graphWord, "display population graph", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.graphOpacityWord + " <0.0..1.0>", "population graph opacity", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.graphPointsWord, "population graph use points", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.noGraphWord, "disable population graph", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.starfieldWord + " (" + Keywords.offWord + ")", "display stars", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.hexDisplayWord, "force hex display", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.squareDisplayWord, "force square display", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.themeWord + " <0.." + (view.engine.numThemes - 1) + ">|" + Keywords.themeCustomWord, "set theme", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.themeBackgroundWord + " R G B", "set theme background", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.themeAliveWord + " R G B", "set theme alive color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.themeAliveRampWord + " R G B", "set theme alive ramp", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.themeDeadWord + " R G B", "set theme dead color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.themeDeadRampWord + " R G B", "set theme dead ramp", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.boundaryWord + " R G B", "set boundary color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " <0.." + String(view.patternStates - 1) + "> R G B", "set state color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.offColorWord + " R G B", "set [R]History state color " + ViewConstants.offState, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.onColorWord + " R G B", "set [R]History state color " + ViewConstants.onState, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.historyColorWord + " R G B", "set [R]History state color " + ViewConstants.historyState, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.mark1ColorWord + " R G B", "set [R]History state color " + ViewConstants.mark1State, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.markOffColorWord + " R G B", "set [R]History state color " + ViewConstants.markOffState, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.mark2ColorWord + " R G B", "set [R]History state color " + ViewConstants.mark2State, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.killColorWord + " R G B", "set [R]History state color " + ViewConstants.killState, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.gridWord + " R G B", "set grid color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.gridMajorWord + " R G B", "set grid major color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.starfieldWord + " R G B", "set star color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.textColorWord + " R G B", "set waypoint message color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.errorColorWord + " R G B", "set error message color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.graphBgColorWord + " R G B", "set graph background color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.graphAxisColorWord + " R G B", "set graph axis color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.graphAliveColorWord + " R G B", "set graph alive color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.graphBirthColorWord + " R G B", "set graph birth color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.graphDeathColorWord + " R G B", "set graph death color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colourWord, "same as " + Keywords.colorWord, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.gpsWord + " <" + ViewConstants.minGenSpeed + ".." + ViewConstants.maxGenSpeed + ">", "set steps per second", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.stepWord + " <" + ViewConstants.minStepSpeed + ".." + ViewConstants.maxStepSpeed + ">", "set generations per step", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.angleWord + " <0..359>", "set camera angle", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.xWord + " <-" + (view.engine.maxGridSize >> 1) + ".." + (view.engine.maxGridSize >> 1) + ">", "set camera x position", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.yWord + " <-" + (view.engine.maxGridSize >> 1) + ".." + (view.engine.maxGridSize >> 1) + ">", "set camera y position", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.zoomWord + " <" + Number(-1 / ViewConstants.minZoom).toFixed(1) + ".." + (ViewConstants.maxZoom).toFixed(1) + ">", "set camera zoom", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.alternateZoomWord, "same as " + Keywords.zoomWord, ctx, x, y, height, helpLine);
		//y = this.renderHelpLine(view, Keywords.integerZoomWord, "enforce integer zoom", ctx, x, y, height, helpLine); TBD
		y = this.renderHelpLine(view, Keywords.layersWord + " <" + ViewConstants.minLayers + ".." + ViewConstants.maxLayers + ">", "set number of layers", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.depthWord + " <" + ViewConstants.minDepth.toFixed(1) + ".." + ViewConstants.maxDepth.toFixed(1) + ">", "set layer depth", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.xOffsetWord + " <-" + (view.engine.maxGridSize >> 1) + ".." + (view.engine.maxGridSize >> 1) + ">", "set pattern x offset", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.yOffsetWord + " <-" + (view.engine.maxGridSize >> 1) + ".." + (view.engine.maxGridSize >> 1) + ">", "set pattern y offset", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.widthWord + " <" + ViewConstants.minViewerWidth + ".." + view.maxCodeWidth + ">", "set LifeViewer width", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.heightWord + " <" + ViewConstants.minViewerHeight + ".." + ViewConstants.maxViewerHeight + ">", "set LifeViewer height", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.popupWidthWord + " <" + ViewConstants.minViewerWidth + ".." + view.maxCodeWidth + ">", "set popup width", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.popupHeightWord + " <" + ViewConstants.minViewerHeight + ".." + ViewConstants.maxViewerHeight + ">", "set popup height", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.showTimingWord, "show timing information", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.extendedTimingWord, "extended timing information", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.showGenStatsWord, "show generation statistics", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.showInfoBarWord, "show information bar", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.deleteRangeWord + " <" + ViewConstants.minDeleteRadius + ".." + ViewConstants.maxDeleteRadius + ">", "set boundary delete range", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.randomSeedWord + " <string>", "set random seed", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		tabs[0] = 128;
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// save information help line number
		view.infoHelpLine = view.lineNo;
		sections[sectionNum] = view.lineNo;
		sectionNum += 1;

		// information
		y = this.renderHelpLine(view, "", "Information", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// display information
		sections[sectionNum] = view.lineNo;
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Display:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Size", view.displayWidth + " x " + view.displayHeight, ctx, x, y, height, helpLine);
		if (DocConfig.limitWidth) {
			y = this.renderHelpLine(view, "Limit Width", view.maxCodeWidth, ctx, x, y, height, helpLine);
		}
		value = view.engine.camZoom;
		if (value < 1) {
			value = -1 / value;
		}
		y = this.renderHelpLine(view, "View", "X " + -((view.engine.width / 2 - (view.engine.xOff + view.engine.originX)) | 0) + "  Y " + -((view.engine.height / 2 - (view.engine.yOff + view.engine.originY)) | 0) + "  Z " + (value.toFixed(2)) + "  ANGLE " + (view.engine.angle.toFixed(0)), ctx, x, y, height, helpLine);
		value = view.savedZoom;
		if (value < 1) {
			value = 1 / value;
		}
		y = this.renderHelpLine(view, "Saved View", "X " + -((view.engine.width / 2 - view.savedX) | 0) + "  Y " + -((view.engine.height / 2 - view.savedY) | 0) + "  Z " + (value.toFixed(2)) + "  ANGLE " + (view.savedAngle.toFixed(0)), ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Origin", "X " + view.engine.originX.toFixed(2) + "  Y " + view.engine.originY.toFixed(2) + "  Z " + view.engine.originZ.toFixed(3), ctx, x, y, height, helpLine);
		if (view.viewOnly) {
			if (view.multiStateView) {
				modeName = "Multi-State Viewer";
			}
			else {
				modeName = "Viewer";
			}
		}
		else {
			if (view.engine.isLifeHistory) {
				modeName = "History Player";
			}
		}
		y = this.renderHelpLine(view, "Type", modeName, ctx, x, y, height, helpLine);
		if (view.engine.isHex) {
			modeName = "Hex";
		}
		else {
			modeName = "Square";
		}
		y = this.renderHelpLine(view, "Mode", modeName, ctx, x, y, height, helpLine);
		if (view.thumbnailEverOn) {
			y = this.renderHelpLine(view, "Thumbnail", "1/" + view.thumbnailDivisor, ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// pattern information
		sections[sectionNum] = view.lineNo;
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Pattern:", ctx, x, y, height, helpLine);

		// check name and originator
		if (view.patternName !== "") {
			y = this.renderHelpLine(view, "Name", view.patternName, ctx, x, y, height, helpLine);
		}
		if (view.patternOriginator !== "") {
			y = this.renderHelpLine(view, "Originator", view.patternOriginator, ctx, x, y, height, helpLine);
		}

		y = this.renderHelpLine(view, "Actual Size", view.patternWidth + " x " + view.patternHeight, ctx, x, y, height, helpLine);
		if (view.specifiedWidth !== -1 && view.specifiedHeight !== -1) {
			y = this.renderHelpLine(view, "Specified", view.specifiedWidth + " x " + view.specifiedHeight, ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, "Offset", "X " + view.xOffset + "  Y " + view.yOffset, ctx, x, y, height, helpLine);
		if (view.genDefined) {
			y = this.renderHelpLine(view, "CXRLE Gen", view.genOffset, ctx, x, y, height, helpLine);
		}
		if (view.posDefined) {
			y = this.renderHelpLine(view, "CXRLE Pos", "X " + view.posXOffset + "  Y " + view.posYOffset, ctx, x, y, height, helpLine);
		}
		if (view.wasClipped) {
			y = this.renderHelpLine(view, "Clipped", (view.engine.boundedGridWidth === 0 ? "Inf" : view.engine.boundedGridWidth) + " x " + (view.engine.boundedGridHeight === 0 ? "Inf" : view.engine.boundedGridHeight) + " " + PatternManager.boundedGridName(view.engine.boundedGridType), ctx, x, y, height, helpLine);
		}

		if (!view.executable) {
			ruleName = view.patternRuleName;
			if (ruleName === "") {
				ruleName = "(none)";
			}
		}
		else {
			ruleName = view.patternRuleName;
		}

		// check for MAP rule
		if (ruleName.substr(0, 3) === "MAP" && ruleName.length === PatternManager.map512Length + 3) {
			// display on multiple lines
			y = this.renderHelpLine(view, "Rule", "MAP", ctx, x, y, height, helpLine);
			value = 3;
			while (value < PatternManager.map512Length + 3) {
				y = this.renderHelpLine(view, "  " + (value - 3), ruleName.substr(value, 16), ctx, x, y, height, helpLine);
				value += 16;
			}
		}
		else {
			// display short MAP or non-MAP rule on a single line
			y = this.renderHelpLine(view, "Rule", ruleName, ctx, x, y, height, helpLine);
		}

		// check for alias name
		if (view.patternAliasName !== "") {
			y = this.renderHelpLine(view, "Alias", view.patternAliasName, ctx, x, y, height, helpLine);
		}

		// display neighbourhood
		if (view.engine.wolframRule !== -1) {
			ruleName = "1D";
		}
		else {
			if (view.engine.patternDisplayMode) {
				ruleName = "Hex";
			}
			else {
				if (view.engine.isVonNeumann) {
					ruleName = "Von Neumann";
				}
				else {
					ruleName = "Moore";
				}
			}
		}
		y = this.renderHelpLine(view, "N'hood", ruleName, ctx, x, y, height, helpLine);

		// get number of states
		statesName = view.patternStates;
		if (view.patternStates > 2 && view.patternUsedStates !== view.patternStates) {
			statesName = view.patternUsedStates + " of " + statesName;
		}
		y = this.renderHelpLine(view, "States", statesName, ctx, x, y, height, helpLine);

		// state counts
		if (view.patternStateCount) {
			for (i = 1; i < view.patternStates; i += 1) {
				if (view.patternStateCount[i]) {
					y = this.renderHelpLine(view, "State " + i, view.patternStateCount[i], ctx, x, y, height, helpLine);
				}
			}
		}

		// output decoder used
		y = this.renderHelpLine(view, "Decoder", view.patternFormat, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// grid information
		sections[sectionNum] = view.lineNo;
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Grid:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Size", view.engine.width + " x " + view.engine.height, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Maximum", view.engine.maxGridSize + " x " + view.engine.maxGridSize, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Area", this.areaString(view), ctx, x, y, height, helpLine);
		if ((view.engine.counter & 1) !== 0) {
			y = this.renderHelpLine(view, "Tiles", (view.engine.tileCount(view.engine.nextTileGrid) + " / " + view.engine.tileCount(view.engine.colourTileHistoryGrid)), ctx, x, y, height, helpLine);
		}
		else {
			y = this.renderHelpLine(view, "Tiles", (view.engine.tileCount(view.engine.tileGrid) + " / " + view.engine.tileCount(view.engine.colourTileHistoryGrid)), ctx, x, y, height, helpLine);
		}
		if (view.engine.state6TileGrid) {
			y = this.renderHelpLine(view, "State6", view.engine.tileCount(view.engine.state6TileGrid), ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, "Tile Size", (view.engine.tileX << 3) + " x " + view.engine.tileY, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Generation", view.engine.counter, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "DeleteRange", view.engine.removePatternRadius, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// bounded grid information
		if (view.engine.boundedGridType !== -1) {
			sections[sectionNum] = view.lineNo;
			sectionNum += 1;
			y = this.renderHelpLine(view, "", "Bounded grid:", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Type", PatternManager.boundedGridName(view.engine.boundedGridType), ctx, x, y, height, helpLine);
			if (view.engine.boundedGridWidth === 0) {
				y = this.renderHelpLine(view, "Width", "Infinite", ctx, x, y, height, helpLine);
			}
			else {
				y = this.renderHelpLine(view, "Width", view.engine.boundedGridWidth, ctx, x, y, height, helpLine);
			}
			// sphere only has width
			if (view.engine.boundedGridType !== 4) {
				if (view.engine.boundedGridHeight === 0) {
					y = this.renderHelpLine(view, "Height", "Infinite", ctx, x, y, height, helpLine);
				}
				else {
					y = this.renderHelpLine(view, "Height", view.engine.boundedGridHeight, ctx, x, y, height, helpLine);
				}

				// klein bottle has twist
				if (view.engine.boundedGridType === 2) {
					if (view.engine.boundedGridHorizontalTwist) {
						y = this.renderHelpLine(view, "Twist", "Horizontal", ctx, x, y, height, helpLine);
					}
					else {
						y = this.renderHelpLine(view, "Twist", "Vertical", ctx, x, y, height, helpLine);
					}
				}

				// check for shifts
				if (view.engine.boundedGridHorizontalShift !== 0) {
					y = this.renderHelpLine(view, "H'Shift", view.engine.boundedGridHorizontalShift, ctx, x, y, height, helpLine);
				}
				if (view.engine.boundedGridVerticalShift !== 0) {
					y = this.renderHelpLine(view, "V'Shift", view.engine.boundedGridVerticalShift, ctx, x, y, height, helpLine);
				}
			}
			y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		}

		// autofit
		sections[sectionNum] = view.lineNo;
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "AutoFit:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Enabled", view.autoFit ? "On" : "Off", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Mode", this.autoFitName(view), ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// track
		sections[sectionNum] = view.lineNo;
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Track:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Enabled", (view.trackDefined && !view.trackDisabled) ? "On" : "Off", ctx, x, y, height, helpLine);
		if (view.trackDefined) {
			if (view.trackBoxDefined) {
				y = this.renderHelpLine(view, "Mode", "Track Box", ctx, x, y, height, helpLine);
				y = this.renderHelpLine(view, "Definition", "E " + view.trackBoxE.toFixed(3) + "  S " + view.trackBoxS.toFixed(3) + "  W " + view.trackBoxW.toFixed(3) + "  N " + view.trackBoxN.toFixed(3), ctx, x, y, height, helpLine);
			}
			else {
				y = this.renderHelpLine(view, "Mode", "Track", ctx, x, y, height, helpLine);
				y = this.renderHelpLine(view, "Definition", "X " + view.trackBoxE.toFixed(3) + "  Y " + view.trackBoxS.toFixed(3), ctx, x, y, height, helpLine);
			}
		}
		y = this.renderHelpLine(view, "Current", "E " + view.currentTrackSpeedE.toFixed(3) + "  S " + view.currentTrackSpeedS.toFixed(3) + "  W " + view.currentTrackSpeedW.toFixed(3) + "  N " + view.currentTrackSpeedN.toFixed(3), ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// snapshot information
		sections[sectionNum] = view.lineNo;
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Step back:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Enabled", view.noHistory ? "Off" : "On", ctx, x, y, height, helpLine);
		if (!view.noHistory) {
			y = this.renderHelpLine(view, "Snapshots", view.engine.snapshotManager.usedBuffers() + "/" + view.engine.snapshotManager.buffers(), ctx, x, y, height, helpLine);
			i = 0;
			value = view.engine.snapshotManager.numResetPoints();
			if (value > 0) {
				y = this.renderHelpLine(view, "Reset Gens", value, ctx, x, y, height, helpLine);
				while (i < value) {
					y = this.renderHelpLine(view, String(i), (view.engine.snapshotManager.resetSnapshots[i].counter), ctx, x, y, height, helpLine);
					i += 1;
				}
			}
			y = this.renderHelpLine(view, "Buffer", (view.engine.snapshotManager.bufferSize() >> 10) + "K", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Next Gen", view.engine.nextSnapshotTarget, ctx, x, y, height, helpLine);

		}
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// engine information
		sections[sectionNum] = view.lineNo;
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Engine:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Name", ViewConstants.versionName, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Build", ViewConstants.versionBuild, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Author", ViewConstants.versionAuthor, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Decoders", "RLE, Life 1.06, Life 1.05, Cells", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "N'hoods", "Moore, Hex, Von Neumann, 1D", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Rules", "Wolfram, Totalistic, Generations,", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " ", "Isotropic Non-Totalistic (Hensel),", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " ", "Larger Than Life, MAP", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "BoundedGrid", "Plane, Torus, Klein, Cross-surface, Sphere", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "States", "2 state, [R]History, Niemiec,", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " ", "Generations, Larger Than Life", ctx, x, y, height, helpLine);

		y = this.renderHelpLine(view, "Viewers", Controller.viewers.length, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Playing", Controller.viewersPlaying(), ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// colour set information
		tabs[1] = 210;
		tabs[2] = 270;
		tabs[3] = 330;
		if (view.multiStateView) {
			sections[sectionNum] = view.lineNo;
			sectionNum += 1;
			y = this.renderHelpLine(view, "", "Set:", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Name", view.colourSetName, ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Used", view.patternUsedStates, ctx, x, y, height, helpLine);
			for (i = 0; i < colourList.length; i += 1) {
				// check if the state is used
				if (view.customColourUsed[i] !== ViewConstants.stateNotUsed) {
					// get colour value
					colourValue = this.rgbString((colourList[i] >> 16) & 255, (colourList[i] >> 8) & 255, colourList[i] & 255);
					colourName = String(i);
					
					// if the colour is custom (but the whole set isn't custom) then add a star to the name
					if (view.customColourUsed[i] === ViewConstants.stateUsedCustom && !view.allCustom) {
						colourName += "*";
					}

					// render the colour box
					this.renderColourBox(view, colourList[i] >> 16, (colourList[i] >> 8) & 255, colourList[i] & 255, ctx, x + tabs[0], y, height, helpLine);

					y = this.renderHelpLine(view, colourName, colourValue, ctx, x, y, height, helpLine);
				}
			}
		}
		else {
			// colour theme information
			sections[sectionNum] = view.lineNo;
			sectionNum += 1;
			y = this.renderHelpLine(view, "", "Theme:", ctx, x, y, height, helpLine);
			if (view.engine.colourTheme === view.engine.numThemes) {
				themeName = "(custom)";
			}
			else {
				themeName = String(view.engine.colourTheme);
			}
			y = this.renderHelpLine(view, "Name", themeName, ctx, x, y, height, helpLine);
			this.renderColourBox(view, view.engine.redChannel[0], view.engine.greenChannel[0], view.engine.blueChannel[0], ctx, x + tabs[0], y, height, helpLine);
			y = this.renderHelpLine(view, "Background", this.rgbString(view.engine.redChannel[0], view.engine.greenChannel[0], view.engine.blueChannel[0]), ctx, x, y, height, helpLine);

			// check for generations rule
			if (view.engine.multiNumStates !== -1) {
				for (i = 1; i < view.engine.multiNumStates; i += 1) {
					this.renderColourBox(view, view.engine.redChannel[i], view.engine.greenChannel[i], view.engine.blueChannel[i], ctx, x + tabs[0], y, height, helpLine);
					y = this.renderHelpLine(view, "State " + i, this.rgbString(view.engine.redChannel[i], view.engine.greenChannel[i], view.engine.blueChannel[i]), ctx, x, y, height, helpLine);
				}
			}
			else {
				// normal theme
				this.renderColourBox(view, theme.aliveRange.startColour.red, theme.aliveRange.startColour.green, theme.aliveRange.startColour.blue, ctx, x + tabs[0], y, height, helpLine);
				y = this.renderHelpLine(view, "Alive", this.rgbObjectString(theme.aliveRange.startColour), ctx, x, y, height, helpLine);

				// check if there is a ramp between alive start and end
				if (theme.aliveRange.startColour.red !== theme.aliveRange.endColour.red || theme.aliveRange.startColour.green !== theme.aliveRange.endColour.green || theme.aliveRange.startColour.blue !== theme.aliveRange.endColour.blue) {
					this.renderColourBox(view, theme.aliveRange.endColour.red, theme.aliveRange.endColour.green, theme.aliveRange.endColour.blue, ctx, x + tabs[0], y, height, helpLine);
					y = this.renderHelpLine(view, "AliveRamp", this.rgbObjectString(theme.aliveRange.endColour), ctx, x, y, height, helpLine);
				}
				else {
					y = this.renderHelpLine(view, "AliveRamp", "    (none)", ctx, x, y, height, helpLine);
				}

				this.renderColourBox(view, theme.deadRange.startColour.red, theme.deadRange.startColour.green, theme.deadRange.startColour.blue, ctx, x + tabs[0], y, height, helpLine);
				y = this.renderHelpLine(view, "Dead", this.rgbObjectString(theme.deadRange.startColour), ctx, x, y, height, helpLine);

				// check if there is a ramp between dead start and end
				if (theme.deadRange.startColour.red !== theme.deadRange.endColour.red || theme.deadRange.startColour.green !== theme.deadRange.endColour.green || theme.deadRange.startColour.blue !== theme.deadRange.endColour.blue) {
					this.renderColourBox(view, theme.deadRange.endColour.red, theme.deadRange.endColour.green, theme.deadRange.endColour.blue, ctx, x + tabs[0], y, height, helpLine);
					y = this.renderHelpLine(view, "DeadRamp", this.rgbObjectString(theme.deadRange.endColour), ctx, x, y, height, helpLine);
				}
				else {
					y = this.renderHelpLine(view, "DeadRamp", "    (none)", ctx, x, y, height, helpLine);
				}
			}

			// check for History rules
			if (view.engine.isLifeHistory) {
				for (i = 3; i <= 6; i += 1) {
					value = 128 + ViewConstants.stateMap[i];
					colourValue = this.rgbString(view.engine.redChannel[value], view.engine.greenChannel[value], view.engine.blueChannel[value]);
					colourName = ViewConstants.stateNames[i];
					
					// render the colour box
					this.renderColourBox(view, view.engine.redChannel[value], view.engine.greenChannel[value], view.engine.blueChannel[value], ctx, x + tabs[0], y, height, helpLine);

					y = this.renderHelpLine(view, colourName, colourValue, ctx, x, y, height, helpLine);
				}
			}
		}

		// display boundary colour
		this.renderColourBox(view, view.customBoundaryColour[0], view.customBoundaryColour[1], view.customBoundaryColour[2], ctx, x + tabs[0], y, height, helpLine);
		y = this.renderHelpLine(view, "Boundary", this.rgbString(view.customBoundaryColour[0], view.customBoundaryColour[1], view.customBoundaryColour[2]), ctx, x, y, height, helpLine);

		// display custom text colour if defined
		if (view.customTextColour) {
			this.renderColourBox(view, view.customTextColour[0], view.customTextColour[1], view.customTextColour[2], ctx, x + tabs[0], y, height, helpLine);
			y = this.renderHelpLine(view, "Text", this.rgbString(view.customTextColour[0], view.customTextColour[1], view.customTextColour[2]), ctx, x, y, height, helpLine);
		}

		// display custom text colour if defined
		if (view.customErrorColour) {
			this.renderColourBox(view, view.customErrorColour[0], view.customErrorColour[1], view.customErrorColour[2], ctx, x + tabs[0], y, height, helpLine);
			y = this.renderHelpLine(view, "Error", this.rgbString(view.customErrorColour[0], view.customErrorColour[1], view.customErrorColour[2]), ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// grid line information
		sections[sectionNum] = view.lineNo;
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Grid Lines:", ctx, x, y, height, helpLine);
		themeName = view.engine.displayGrid ? "On" : "Off";
		if (view.engine.displayGrid && !view.engine.canDisplayGrid()) {
			themeName += " (Hidden)";
		}
		y = this.renderHelpLine(view, "Enabled", themeName, ctx, x, y, height, helpLine);

		// display grid line colour
		themeName = "Line Color";
		if (view.customGridColour !== -1) {
			themeName += "*";
		}

		// display colour box
		this.renderColourBox(view, view.engine.gridLineRaw >> 16, (view.engine.gridLineRaw >> 8) & 255, view.engine.gridLineRaw & 255, ctx, x + tabs[0], y, height, helpLine);

		y = this.renderHelpLine(view, themeName, this.rgbString(view.engine.gridLineRaw >> 16, (view.engine.gridLineRaw >> 8) & 255, view.engine.gridLineRaw & 255), ctx, x, y, height, helpLine);

		// display grid line major colour
		themeName = "Major Color";
		if (view.customGridMajorColour !== -1) {
			themeName += "*";
		}

		// display colour box
		this.renderColourBox(view, view.engine.gridLineBoldRaw >> 16, (view.engine.gridLineBoldRaw >> 8) & 255, view.engine.gridLineBoldRaw & 255, ctx, x + tabs[0], y, height, helpLine);

		y = this.renderHelpLine(view, themeName, this.rgbString(view.engine.gridLineBoldRaw >> 16, (view.engine.gridLineBoldRaw >> 8) & 255, view.engine.gridLineBoldRaw & 255), ctx, x, y, height, helpLine);

		// grid line major interval
		if (view.engine.gridLineMajor > 0 && view.engine.gridLineMajorEnabled) {
			themeName = String(view.engine.gridLineMajor);
		}
		else {
			themeName = "Off";
		}
		y = this.renderHelpLine(view, "Interval", themeName, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// population graph information
		sections[sectionNum] = view.lineNo;
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Population Graph:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Enabled", view.popGraph ? "On" : "Off", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Disabled", view.graphDisabled ? "On" : "Off", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Mode", view.popGraphLines ? "Lines" : "Points", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Opacity", view.popGraphOpacity.toFixed(2), ctx, x, y, height, helpLine);
		this.renderColourBox(view, view.engine.graphBgColor[0], view.engine.graphBgColor[1], view.engine.graphBgColor[2], ctx, x + tabs[0], y, height, helpLine);
		y = this.renderHelpLine(view, "Bg Color", this.rgbString(view.engine.graphBgColor[0], view.engine.graphBgColor[1], view.engine.graphBgColor[2]), ctx, x, y, height, helpLine);
		this.renderColourBox(view, view.engine.graphAxisColor[0], view.engine.graphAxisColor[1], view.engine.graphAxisColor[2], ctx, x + tabs[0], y, height, helpLine);
		y = this.renderHelpLine(view, "Axis Color", this.rgbString(view.engine.graphAxisColor[0], view.engine.graphAxisColor[1], view.engine.graphAxisColor[2]), ctx, x, y, height, helpLine);
		this.renderColourBox(view, view.engine.graphAliveColor[0], view.engine.graphAliveColor[1], view.engine.graphAliveColor[2], ctx, x + tabs[0], y, height, helpLine);
		y = this.renderHelpLine(view, "Alive Color", this.rgbString(view.engine.graphAliveColor[0], view.engine.graphAliveColor[1], view.engine.graphAliveColor[2]), ctx, x, y, height, helpLine);
		this.renderColourBox(view, view.engine.graphBirthColor[0], view.engine.graphBirthColor[1], view.engine.graphBirthColor[2], ctx, x + tabs[0], y, height, helpLine);
		y = this.renderHelpLine(view, "Birth Color", this.rgbString(view.engine.graphBirthColor[0], view.engine.graphBirthColor[1], view.engine.graphBirthColor[2]), ctx, x, y, height, helpLine);
		this.renderColourBox(view, view.engine.graphDeathColor[0], view.engine.graphDeathColor[1], view.engine.graphDeathColor[2], ctx, x + tabs[0], y, height, helpLine);
		y = this.renderHelpLine(view, "Death Color", this.rgbString(view.engine.graphDeathColor[0], view.engine.graphDeathColor[1], view.engine.graphDeathColor[2]), ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// random seed information
		sections[sectionNum] = view.lineNo;
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Random Seed:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Custom", view.randomSeedCustom ? "On" : "Off", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Seed", view.randomSeed, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// starfield information
		sections[sectionNum] = view.lineNo;
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Stars:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Enabled", view.starsOn ? "On" : "Off", ctx, x, y, height, helpLine);

		this.renderColourBox(view, view.starField.red, view.starField.green, view.starField.blue, ctx, x + tabs[0], y, height, helpLine);
		y = this.renderHelpLine(view, "Color", this.rgbObjectString(view.starField), ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// script information
		sections[sectionNum] = view.lineNo;
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Script:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Commands", view.numScriptCommands, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Errors", view.numScriptErrors, ctx, x, y, height, helpLine);

		// waypoints
		if (view.waypointsDefined) {
			y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
			sections[sectionNum] = view.lineNo;
			sectionNum += 1;
			y = this.renderHelpLine(view, "", "Waypoints:", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Enabled", view.waypointsDisabled ? "Off" : "On", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Number", view.waypointManager.numWaypoints(), ctx, x, y, height, helpLine);
			for (i = 0; i < view.waypointManager.numWaypoints(); i += 1) {
				themeName = String(i);

				// check for current waypoint
				if (i === view.waypointManager.tempIndex) {
					// check if at last waypoint
					if (view.waypointManager.atLast(view.elapsedTime)) {
						themeName += ">";
					}
					else {
						themeName += "*";
					}
				}
				y = this.renderHelpLine(view, themeName, view.waypointManager.waypointAsText(i, Keywords.stringDelimiter), ctx, x, y, height, helpLine);
			}
		}

		// points of interest
		if (view.waypointManager.numPOIs()) {
			y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
			sections[sectionNum] = view.lineNo;
			sectionNum += 1;
			y = this.renderHelpLine(view, "", "Points of interest:", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Number", view.waypointManager.numPOIs(), ctx, x, y, height, helpLine);
			for (i = 0; i < view.waypointManager.numPOIs(); i += 1) {
				themeName = String(i + 1);
				if (i === view.currentPOI) {
					themeName += "*";
				}
				if (i === view.defaultPOI) {
					themeName += " INITIAL";
				}
				flag = false;
				colourName = view.waypointManager.poiCameraAsText(i);
				if (colourName !== "") {
					y = this.renderHelpLine(view, (flag ? " " : themeName), (flag ? "  " : "") + colourName, ctx, x, y, height, helpLine);
					flag = true;
				}
				colourName = view.waypointManager.poiThemeDepthLayerAsText(i);
				if (colourName !== "") {
					y = this.renderHelpLine(view, (flag ? " " : themeName), (flag ? "  " : "") + colourName, ctx, x, y, height, helpLine);
					flag = true;
				}
				colourName = view.waypointManager.poiLoopStopGpsStepAsText(i);
				if (colourName !== "") {
					y = this.renderHelpLine(view, (flag ? " " : themeName), (flag ? "  " : "") + colourName, ctx, x, y, height, helpLine);
					flag = true;
				}
				colourName = view.waypointManager.poiActionAsText(i);
				if (colourName !== "") {
					y = this.renderHelpLine(view, (flag ? " " : themeName), (flag ? "  " : "") + colourName, ctx, x, y, height, helpLine);
					flag = true;
				}
				colourName = view.waypointManager.poiStartGenAsText(i);
				if (colourName !== "") {
					y = this.renderHelpLine(view, (flag ? " " : themeName), (flag ? "  " : "") + colourName, ctx, x, y, height, helpLine);
					flag = true;
				}
				colourName = view.waypointManager.poiMessageAsText(i, Keywords.stringDelimiter);
				if (colourName !== "") {
					y = this.renderHelpLine(view, (flag ? " " : themeName), (flag ? "  " : "") + colourName, ctx, x, y, height, helpLine);
					flag = true;
				}
			}
		}

		// loop
		if (view.loopGeneration !== -1) {
			y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
			sections[sectionNum] = view.lineNo;
			sectionNum += 1;
			y = this.renderHelpLine(view, "", "Loop:", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Enabled", view.loopDisabled ? "Off" : "On", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Generation", view.loopGeneration, ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// memory information
		tabs[1] = 200;
		tabs[2] = 290;
		tabs[3] = 530;
		sections[sectionNum] = view.lineNo;
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Memory:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Allocations", view.engine.allocator.numAllocs + "\t" + (view.engine.allocator.totalBytes >> 20) + "M\t" + view.engine.allocator.totalBytes, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Frees", view.engine.allocator.numFrees + "\t" + (view.engine.allocator.totalFreedBytes >> 20) + "M\t" + view.engine.allocator.totalFreedBytes, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "In Use", (view.engine.allocator.numAllocs - view.engine.allocator.numFrees) + "\t" + ((view.engine.allocator.totalBytes - view.engine.allocator.totalFreedBytes) >> 20) + "M\t" + (view.engine.allocator.totalBytes - view.engine.allocator.totalFreedBytes), ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, this.pad("Bytes", 10), "Type\tElements\tName\tCount", ctx, x, y, height, helpLine);
		for (i = 0; i < view.engine.allocator.allocations.length; i += 1) {
			y = this.renderHelpLine(view, this.pad(String(view.engine.allocator.allocations[i].size), 10), view.engine.allocator.allocationInfo(i), ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// aliases
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		sections[sectionNum] = view.lineNo;
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Aliases", ctx, x, y, height, helpLine);

		// display alias table
		tabs[0] = 260;
		for (i = 0; i < AliasManager.aliases.length; i += 1) {
			// check for category
			if (AliasManager.aliases[i][1] === "") {
				// render category
				y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
				sections[sectionNum] = view.lineNo;
				sectionNum += 1;
				y = this.renderHelpLine(view, "", AliasManager.aliases[i][0] + " Aliases:", ctx, x, y, height, helpLine);
			}
			else {
				// check for default alias
				if (AliasManager.aliases[i][0] !== "") {
					// render non-default alias
					y = this.renderHelpLine(view, AliasManager.aliases[i][0], AliasManager.aliases[i][1], ctx, x, y, height, helpLine);
				}
			}
		}

		// display colour names
		tabs[1] = 320;
		tabs[2] = 380;
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		sections[sectionNum] = view.lineNo;
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Colours", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "The following names can be used in place of R G B:", ctx, x, y, height, helpLine);
		for (i = 0; i < keys.length; i += 1) {
			namedCol = cmList[keys[i]];
			y = this.renderHelpLine(view, namedCol[0], namedCol[1] + "\t" + namedCol[2] + "\t" + namedCol[3], ctx, x, y, height, helpLine);
		}

		// save number of help lines
		view.numHelpLines = view.lineNo - 1;

		// compute the last line displayed
		endLine = helpLine + view.numHelpPerPage;
		if (endLine > view.numHelpLines) {
			endLine = view.numHelpLines;
		}

		// display the footer at the bottom
		view.lineNo = 1;
		tabs[0] = 120;
		y = topY + height * (view.numHelpPerPage + 2);
		y = this.renderHelpLineUpDown(view, "Up", " / ", "Down", "scroll help", ctx, x, y, height, 0);
		if (view.isInPopup) {
			y = this.renderHelpLine(view, "H", "close help", ctx, x, y, height, 0);
		}
		else {
			y = this.renderHelpLine(view, "H / Esc", "close help", ctx, x, y, height, 0);
		}
	};

	// draw help text
	Help.drawHelpText = function(view) {
		var ctx = view.offContext,
		    lineHeight = 19;

		// compute the number of lines that will fit on the page
		view.numHelpPerPage = ((view.displayHeight / lineHeight) | 0) - 6;

		// dim background
		ctx.fillStyle = "black";
		ctx.globalAlpha = 0.5;
		ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.globalAlpha = 1;

		// draw shadow
		ctx.fillStyle = ViewConstants.helpShadowColour; 
		this.renderHelpText(view, ctx, 6, 14, lineHeight, view.displayHelp | 0);

		// draw text
		ctx.fillStyle = ViewConstants.helpFontColour;
		this.renderHelpText(view, ctx, 4, 12, lineHeight, view.displayHelp | 0);
	};

	// render error with up down greyed based on position
	Help.renderErrorLineUpDown = function(view, up, separator, down, error, ctx, x, y, height, startLine) {
		var result = y,

		    // get the width of the command
		    width = 0,

		    // only change colour if not drawing shadow
		    drawingShadow = false,

		    // get line number
		    lineNo = view.lineNo;

		// check if drawing shadow
		if (ctx.fillStyle === ViewConstants.helpShadowColour) {
			drawingShadow = true;
		}

		// check if the line on the page
		if (lineNo >= startLine && lineNo <= (startLine + view.numHelpPerPage)) {
			// output up
			ctx.font = ViewConstants.fixedFont;

			// set colour based on whether errors can scroll up
			if (!drawingShadow) {
				if ((view.displayErrors | 0) > 1) {
					ctx.fillStyle = view.errorsFontColour;
				}
				else {
					ctx.fillStyle = ViewConstants.greyFontColour;
				}
			}
			ctx.fillText(up, x, y);

			// draw the separator
			if (!drawingShadow) {
				ctx.fillStyle = view.errorsFontColour;
			}
			ctx.fillText(separator, x + ctx.measureText(up).width, y);

			// set colour based on whether errors can scroll down
			if (!drawingShadow) {
				if ((view.displayErrors | 0) < view.scriptErrors.length - view.numHelpPerPage + 1) {
					ctx.fillStyle = view.errorsFontColour;
				}
				else {
					ctx.fillStyle = ViewConstants.greyFontColour;
				}
			}
			ctx.fillText(down, x + ctx.measureText(up + separator).width, y);

			// use tab width rather than command width if specified
			if (view.tabs[0]) {
				width = view.tabs[0];
			}

			// draw error message
			if (!drawingShadow) {
				ctx.fillStyle = view.errorsFontColour;
			}
			ctx.font = ViewConstants.variableFont;
			ctx.fillText(error, x + width, y);

			// move the y coordinate to the next screen line
			result += height;
		}

		// return the next y coordinate
		return result;
	};

	// render error
	Help.renderErrorLine = function(view, command, error, ctx, x, y, height, startLine) {
		var result = y,

		    // get the width of the command
		    width = 0,

		    // line number
		    lineNo = view.lineNo;

		// check if the line on the page
		if (lineNo >= startLine && lineNo <= (startLine + view.numHelpPerPage)) {
			// draw command if supplied
			if (command.length) {
				ctx.font = ViewConstants.fixedFont;
				ctx.fillText(command, x, y);
				width = ctx.measureText(command + " ").width;
			}

			// use tab width rather than command width if specified
			if (view.tabs[0]) {
				width = view.tabs[0];
			}

			// draw error message
			ctx.font = ViewConstants.variableFont;
			ctx.fillText(error, x + width, y);

			// move the y coordinate to the next screen line
			result += height;
		}

		// increment line number
		view.lineNo += 1;

		// return the next y coordinate
		return result;
	};

	// render script errors
	Help.renderErrors = function(view, ctx, x, y, height, errorLine) {
		var i = 0,
		    scriptErrors = view.scriptErrors,
		    topY = y;

		// set initial line
		view.lineNo = 1;

		// draw the title
		view.tabs[0] = 0;
		ctx.font = ViewConstants.variableFont;
		y = this.renderErrorLine(view, "", ViewConstants.scriptErrorTitle, ctx, x, y, height, errorLine);

		// draw each error
		for (i = 0; i < scriptErrors.length; i += 1) {
			y = this.renderErrorLine(view, scriptErrors[i][0], scriptErrors[i][1], ctx, x, y, height, errorLine);
		}

		// display the footer at the bottom if not in thumbnail mode
		if (!view.thumbnail) {
			view.tabs[0] = 120;
			view.lineNo = 1;

			// draw escape to clear
			y = topY + height * (view.numHelpPerPage + 2);
			y = this.renderErrorLineUpDown(view, "Up", " / ", "Down", "scroll errors", ctx, x, y, height, 0);
			y = this.renderErrorLine(view, "Esc", "clear messages", ctx, x, y, height, 0);

			// draw h for help
			y = this.renderErrorLine(view, "H  ", "help on script commands", ctx, x, y, height, 0);
		}
	};

	// draw script errors
	Help.drawErrors = function(view) {
		var ctx = view.offContext,

		    // text line height in pixels
		    lineHeight = 19,

		    // number of footer lines
		    footerLines = 7;

		// check for thumbnail
		if (view.thumbnail) {
			footerLines = 1;
		}

		// compute the number of lines that will fit on the page
		view.numHelpPerPage = ((view.displayHeight / lineHeight) | 0) - footerLines;

		// dim background
		ctx.fillStyle = "black";
		ctx.globalAlpha = 0.5;
		ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.globalAlpha = 1;

		// draw shadow
		ctx.fillStyle = ViewConstants.helpShadowColour;
		this.renderErrors(view, ctx, 6, 14, lineHeight, view.displayErrors | 0);

		// draw text
		ctx.fillStyle = view.errorsFontColour;
		this.renderErrors(view, ctx, 4, 12, lineHeight, view.displayErrors | 0);
	};

	window['Help'] = Help;
}
());

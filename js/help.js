// LifeViewer Help
// written by Chris Rowett

(function() {
	// use strict mode
	"use strict";

	// define globals
	/* global LifeConstants ViewConstants PatternConstants RuleTreeCache ColourManager Keywords WaypointConstants DocConfig Controller AliasManager littleEndian arrayFill arraySlice copyWithin */

	// Help singleton
	var Help = {
		// shadow x offset
		shadowX : 0,
		copyText : "",
		copying : false
	};

	// render truncated LifeSuper state name so final character is always included
	Help.superName = function(state) {
		var name = LifeConstants.namesSuper[state];

		if (name.length > 10) {
			// perform substitutions
			name = name.replace(/marked/, "mkd");
			name = name.replace(/trail/, "trl");
			if (name.length > 10) {
				if (name.substr(-1) >= "1" && name.substr(-1) <= "9") {
					name = name.substr(0,9) + name.substr(-1);
				} else {
					name = name.substr(0, 10);
				}
			}
		}

		return name;
	};

	// draw a line of help text with up down greyed based on position
	Help.renderHelpLineUpDown = function(view, up, separator, down, text, ctx, x, y, height, startLine) {
		var result = y,
		    
			// scale
			xScale = view.viewMenu.xScale,
			yScale = view.viewMenu.xScale,

			// shadow
			shadowX = this.shadowX * xScale,
			shadowY = this.shadowX * yScale,

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
				ctx.font = view.helpFixedFont;

				// set colour based on whether help can scroll up
				if (!drawingShadow) {
					if ((view.displayHelp | 0) > 1) {
						ctx.fillStyle = ViewConstants.helpFontColour;
					} else {
						ctx.fillStyle = ViewConstants.greyFontColour;
					}
				}
				ctx.fillText(up, x + shadowX, y + shadowY);

				// draw the separator
				if (!drawingShadow) {
					ctx.fillStyle = ViewConstants.helpFontColour;
				}
				ctx.fillText(separator, x + shadowX + ctx.measureText(up).width, y + shadowY);

				// set colour based on whether help can scroll down
				if (!drawingShadow) {
					if ((view.displayHelp | 0) < view.numHelpLines - view.numHelpPerPage) {
						ctx.fillStyle = ViewConstants.helpFontColour;
					} else {
						ctx.fillStyle = ViewConstants.greyFontColour;
					}
				}
				ctx.fillText(down, x + shadowX + ctx.measureText(up + separator).width, y + shadowY);

				// draw the variable part
				if (!drawingShadow) {
					ctx.fillStyle = ViewConstants.helpFontColour;
				}
				ctx.font = view.helpVariableFont;
				ctx.fillText(text, x + shadowX + (view.tabs[0] * xScale), y + shadowY);

				// move the y coordinate to the next screen line
				result += height;
			}
		}

		// increment line number
		view.lineNo += 1;

		// return the next y coordinate
		return result;
	};

	// convert bytes to MBytes
	Help.asMByte = function(bytes) {
		var mb = bytes / (1024 * 1024),
		    result = "";
		if (mb < 10) {
			result = String(mb.toFixed(1));
		} else {
			result = String(mb.toFixed(0));
		}

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

	// measure text line
	Help.measureText = function(view, ctx, text, item) {
		// get the width cache
		var widthCache = (item ? view.helpVariableCache : view.helpFixedCache),
		    result = 0;

		// check if the width exists in the cache
		if (widthCache[view.lineNo]) {
			result = widthCache[view.lineNo];
		} else {
			// set the correct font
			if (item === 0) {
				ctx.font = view.helpFixedFont;
			} else {
				ctx.font = view.helpVariableFont;
			}

			// measure the width of the text and cache the result
			result = ctx.measureText(text).width;
			widthCache[view.lineNo] = result;
		}

		return result;
	};

	// draw a line of help text
	Help.renderHelpLine = function(view, fixed, text, ctx, x, y, height, startLine) {
		var result = y,

		    // tab index in text
		    tab = String(text).indexOf("\t"),

		    // tab number
			tabNo = 0,

			// text width in pixels
			width = 0,

			// rule divider
			divider = 0,
			nextComma = 0,

			// whether text was drawn
			drewText = false,

			// view scaling factors
			xScale = view.viewMenu.xScale,
			yScale = view.viewMenu.yScale,

			// shadow offset
			shadowX = this.shadowX * xScale,
			shadowY = this.shadowX * yScale,

			// lower case string
			lower = "",

			// whether text should be drawn
			shouldDraw = (view.lineNo >= startLine && view.lineNo <= (startLine + view.numHelpPerPage));

		// check for copy
		if (Help.copying && Help.shadowX === 0) {
			if (fixed === "") {
				Help.copyText += text + "\n";
			} else {
				// ignore Esc text
				if (fixed !== "H / Esc") {
					Help.copyText += fixed + "\t" + text + "\n";
				}
			}
		}

		// check if there is fixed text
		if (fixed.length) {
			if (shouldDraw) {
				ctx.font = view.helpFixedFont;
				ctx.fillText(fixed, x + shadowX, y + shadowY);
			}

			// check if the fixed portion was wider than the first tab
			width = this.measureText(view, ctx, fixed, 0);
			if (width > (view.tabs[tabNo] * xScale) && text !== "") {
				// move the variable portion onto the next line
				if (shouldDraw) {
					y += height;
					result += height;
				}
				view.lineNo += 1;
				shouldDraw = (view.lineNo >= startLine && view.lineNo <= (startLine + view.numHelpPerPage));
			}

			// draw the variable text
			if (shouldDraw) {
				ctx.font = view.helpVariableFont;
			}
			while (tab !== -1) {
				// draw the text up to the tab at the current tab stop
				if (shouldDraw) {
					ctx.fillText(text.substr(0, tab), x + shadowX + (view.tabs[tabNo] * xScale), y + shadowY);
				}

				// next tab stop
				tabNo += 1;

				// check for next tab
				text = text.substr(tab + 1);
				tab = text.indexOf("\t");
			}

			// check if the text will fit in the window
			drewText = false;
			if (view.wrapHelpText) {
				width = this.measureText(view, ctx, text, 1);

				// check if the text fits
				if (x + (view.tabs[tabNo] * xScale) + width > ctx.canvas.width) {
					// check if the text can be split at "|"
					lower = text.toLowerCase();
					divider = lower.indexOf("|");
					if (divider === -1) {
						// check if the text can be split at "s" for normal or "b" for LtL/HROT
						if (lower[0] === "r") {
							divider = lower.indexOf("b");
						} else {
							if (lower[0] !== "m") {
								divider = lower.indexOf("s");
							}
						}
						if (divider === -1) {
							// try slash
							divider = lower.indexOf("/");
							if (divider !== -1 && lower[0] !== "m") {
								// leave the slash on the first line
								divider += 1;
							} else {
								// pick a point mid-way in the string
								divider = text.length >> 1;
								nextComma = lower.indexOf(",", divider);
								if (nextComma !== -1) {
									divider = nextComma + 1;
								}
							}
						}
					}
					if (divider !== -1) {
						if (shouldDraw) {
							ctx.fillText(text.substr(0, divider), x + shadowX + (view.tabs[tabNo] * xScale), y + shadowY);
							y += height;
							result += height;
						}
						view.lineNo += 1;
						shouldDraw = (view.lineNo >= startLine && view.lineNo <= (startLine + view.numHelpPerPage));
						if (shouldDraw) {
							ctx.fillText("  " + text.substr(divider), x + shadowX + (view.tabs[tabNo] * xScale), y + shadowY);
						}
						drewText = true;
					}
				}
			}
			if (!drewText) {
				// draw on one line
				if (shouldDraw) {
					ctx.fillText(text, x + shadowX + (view.tabs[tabNo] * xScale), y + shadowY);
				}
			}
		} else {
			ctx.font = view.helpVariableFont;
			if (shouldDraw) {
				ctx.fillText(text, x + shadowX, y + shadowY);
			}
		}

		// move the y coordinate to the next screen line
		if (shouldDraw) {
			result += height;
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

		// add hex representation
		result += "\t" + ((1 << 24) | (redValue << 16) | (greenValue << 8) | blueValue).toString(16).slice(-6).toUpperCase();

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
			} else {
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

		// check if any cells are alive
		if (view.engine.anythingAlive) {
			// cells alive so get dimensions from bounding box
			width = view.engine.zoomBox.rightX - view.engine.zoomBox.leftX + 1;
			height = view.engine.zoomBox.topY - view.engine.zoomBox.bottomY + 1;
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

	// convert rgb(rrr,ggg,bbb) to [r, g, b]
	Help.colourFromRGBString = function(colour) {
		var red = 0, green = 0, blue = 0,
			index1 = colour.indexOf(","),
			index2 = colour.lastIndexOf(",");

		red = colour.substring(4, index1);
		green = colour.substring(index1 + 1, index2);
		blue = colour.substring(index2 + 1, colour.length - 1);
		return [red, green, blue];
	};

	// render help text page
	Help.renderHelpText = function(view, ctx, x, y, height, helpLine) {
		var endLine = 0,
			topY = y;

		switch (view.helpTopic) {
			case ViewConstants.welcomeTopic:
				this.renderWelcomeTopic(view, ctx, x, y, height, helpLine);
				break;
			case ViewConstants.keysTopic:
				this.renderKeysTopic(view, ctx, x, y, height, helpLine);
				break;
			case ViewConstants.scriptsTopic:
				this.renderScriptsTopic(view, ctx, x, y, height, helpLine);
				break;
			case ViewConstants.informationTopic:
				this.renderInformationTopic(view, ctx, x, y, height, helpLine);
				break;
			case ViewConstants.themesTopic:
				this.renderThemesTopic(view, ctx, x, y, height, helpLine);
				break;
			case ViewConstants.coloursTopic:
				this.renderColoursTopic(view, ctx, x, y, height, helpLine);
				break;
			case ViewConstants.aliasesTopic:
				this.renderAliasesTopic(view, ctx, x, y, height, helpLine);
				break;
			case ViewConstants.memoryTopic:
				this.renderMemoryTopic(view, ctx, x, y, height, helpLine);
				break;
			case ViewConstants.annotationsTopic:
				this.renderAnnotationsTopic(view, ctx, x, y, height, helpLine);
				break;
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
		view.tabs[0] = 120;
		y = topY + height * (view.numHelpPerPage + 2);
		if (view.helpTopic !== ViewConstants.welcomeTopic) {
			y = this.renderHelpLineUpDown(view, "Up", " / ", "Down", "scroll help", ctx, x, y, height, 0);
		} else {
			y += height;
		}
		if (view.isInPopup) {
			y = this.renderHelpLine(view, "H", "close help", ctx, x, y, height, 0);
		} else {
			y = this.renderHelpLine(view, "H / Esc", "close help", ctx, x, y, height, 0);
		}
	};

	// render welcome topic
	Help.renderWelcomeTopic = function(view, ctx, x, y, height, helpLine) {
		// section number
		var sectionNum = 0;

		// set initial line
		view.lineNo = 1;

		// disable line wrap to start with
		view.wrapHelpText = false;

		// reset sections
		view.helpSections = [];
		
		// title
		view.tabs[0] = 108;
		view.helpSections[sectionNum] = [view.lineNo, "Top"];
		sectionNum += 1;

		y = this.renderHelpLine(view, "", ViewConstants.externalViewerTitle + " build " + ViewConstants.versionBuild + " by " + ViewConstants.versionAuthor, ctx, x, y, height, helpLine);
	};

	// render annotations topic
	Help.renderAnnotationsTopic = function(view, ctx, x, y, height, helpLine) {
		var i = 0, itemName = "", colour = [],

			// section number
			sectionNum = 0,

			// get scale
			xScale = view.viewMenu.xScale;

		// set initial line
		view.lineNo = 1;

		// disable line wrap to start with
		view.wrapHelpText = false;

		// reset sections
		view.helpSections = [];
		
		// annotations 
		view.helpSections[sectionNum] = [view.lineNo, "Top"];
		sectionNum += 1;
		view.tabs[0] = 128;
		view.tabs[1] = 208;
		view.tabs[2] = 288;
		view.tabs[3] = 368;
		y = this.renderHelpLine(view, "", "Annotations", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		view.helpSections[sectionNum] = [view.lineNo, "Labels"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Labels:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Number", view.waypointManager.numLabels(), ctx, x, y, height, helpLine);
		for (i = 0; i < view.waypointManager.numLabels(); i += 1) {
			itemName = "Label " + String(i + 1);
			y = this.renderHelpLine(view, itemName, view.waypointManager.labelAsText1(i), ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, " ", view.waypointManager.labelAsText2(i), ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, " ", view.waypointManager.labelAsText3(i), ctx, x, y, height, helpLine);
			colour = this.colourFromRGBString(view.waypointManager.labelColour(i));
			this.renderColourBox(view, colour[0], colour[1], colour[2], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
			y = this.renderHelpLine(view, "Colour", this.rgbString(colour[0], colour[1], colour[2]), ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		view.helpSections[sectionNum] = [view.lineNo, "Arrows"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Arrows:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Number", view.waypointManager.numArrows(), ctx, x, y, height, helpLine);
		for (i = 0; i < view.waypointManager.numArrows(); i += 1) {
			itemName = "Arrow " + String(i + 1);
			y = this.renderHelpLine(view, itemName, view.waypointManager.arrowAsText1(i), ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, " ", view.waypointManager.arrowAsText2(i), ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, " ", view.waypointManager.arrowAsText3(i), ctx, x, y, height, helpLine);
			colour = this.colourFromRGBString(view.waypointManager.arrowColour(i));
			this.renderColourBox(view, colour[0], colour[1], colour[2], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
			y = this.renderHelpLine(view, "Colour", this.rgbString(colour[0], colour[1], colour[2]), ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		view.helpSections[sectionNum] = [view.lineNo, "Polygons"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Polygons:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Number", view.waypointManager.numPolygons(), ctx, x, y, height, helpLine);
		for (i = 0; i < view.waypointManager.numPolygons(); i += 1) {
			itemName = "Polygon " + String(i + 1);
			y = this.renderHelpLine(view, itemName, view.waypointManager.polyAsText1(i), ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, " ", view.waypointManager.polyAsText2(i), ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, " ", view.waypointManager.polyAsText3(i), ctx, x, y, height, helpLine);
			colour = this.colourFromRGBString(view.waypointManager.polygonColour(i));
			this.renderColourBox(view, colour[0], colour[1], colour[2], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
			y = this.renderHelpLine(view, "Colour", this.rgbString(colour[0], colour[1], colour[2]), ctx, x, y, height, helpLine);
		}
	};

	// render keys topic
	Help.renderKeysTopic = function(view, ctx, x, y, height, helpLine) {
		var i = 0, value = 0,

			// section number
			sectionNum = 0;

		// set initial line
		view.lineNo = 1;

		// disable line wrap to start with
		view.wrapHelpText = false;

		// reset sections
		view.helpSections = [];
		
		// enable line wrap
		view.wrapHelpText = true;
		
		// keyboard commands
		view.tabs[0] = 124;
		view.helpSections[sectionNum] = [view.lineNo, "Top"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Keyboard commands", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// playback controls
		view.helpSections[sectionNum] = [view.lineNo, "Playback"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Playback controls:", ctx, x, y, height, helpLine);
		if (view.multiStateView) {
			y = this.renderHelpLine(view, "R", "reset", ctx, x, y, height, helpLine);
		} else {
			y = this.renderHelpLine(view, "Enter", "toggle play / pause", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Space", "pause / next generation", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "B", "pause / previous generation", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Backspace", "pause / previous generation", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Tab", "pause / next step", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Shift Tab", "pause / previous step", ctx, x, y, height, helpLine);
			if (view.engine.isMargolus || view.engine.isPCA) {
				y = this.renderHelpLine(view, "U", "toggle playback direction", ctx, x, y, height, helpLine);
			}
			if (view.isInPopup) {
				y = this.renderHelpLine(view, "Esc", "close LifeViewer", ctx, x, y, height, helpLine);
			} else {
				y = this.renderHelpLine(view, "Esc", "pause if playing", ctx, x, y, height, helpLine);
			}
			y = this.renderHelpLine(view, "R", "reset to generation 0", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Shift N", "go to generation", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "-", "decrease playback speed", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "+", "increase playback speed", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Shift -", "minimum playback speed", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Shift +", "maximum playback speed", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "0", "reset step and speed", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Ctrl P", "toggle pause playback while drawing", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Alt T", "toggle throttling", ctx, x, y, height, helpLine);
			if (view.waypointsDefined) {
				if (view.loopGeneration !== -1) {
					y = this.renderHelpLine(view, "W", "toggle waypoint playback and loop", ctx, x, y, height, helpLine);
					y = this.renderHelpLine(view, "Shift P", "toggle just loop", ctx, x, y, height, helpLine);
				} else {
					y = this.renderHelpLine(view, "W", "toggle waypoint playback", ctx, x, y, height, helpLine);
				}
			} else {
				if (view.loopGeneration !== -1) {
					y = this.renderHelpLine(view, "W", "toggle loop", ctx, x, y, height, helpLine);
				}
			}
			if (view.autoStart) {
				y = this.renderHelpLine(view, "Alt O", "toggle autostart", ctx, x, y, height, helpLine);
			}
			if (view.stopGeneration !== -1) {
				y = this.renderHelpLine(view, "Alt P", "toggle stop", ctx, x, y, height, helpLine);
			}
		}
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// multiverse controls
		view.helpSections[sectionNum] = [view.lineNo, "Multi"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Multi-Viewer controls:", ctx, x, y, height, helpLine);
		if (DocConfig.multi) {
			y = this.renderHelpLine(view, "Page Up", "previous universe", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Page Down", "next universe", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Home", "first universe", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "End", "last universe", ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, "Shift R", "reset all LifeViewers to generation 0", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Z", "stop playback in all other LifeViewers", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift Z", "stop playback in all LifeViewers", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// camera controls
		view.helpSections[sectionNum] = [view.lineNo, "Camera"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Camera controls:", ctx, x, y, height, helpLine);
		// only display navigation menu key if menu is available
		if ((view.displayHeight >= ViewConstants.minMenuHeight) || ((view.thumbnail && view.thumbOrigHeight) >= ViewConstants.minMenuHeight)) {
			y = this.renderHelpLine(view, "M", "toggle settings menu", ctx, x, y, height, helpLine);
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
			if (!(view.drawing || view.selecting)) {
				for (i = 1; i <= value; i += 1) {
					y = this.renderHelpLine(view, "Alt " + String(i), "jump to POI #" + String(i), ctx, x, y, height, helpLine);
				}
			}
		}

		y = this.renderHelpLine(view, "F", "fit pattern to display", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift F", "toggle autofit", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift H", "toggle autofit history mode", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl F", "fit selection to display", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl M", "center pattern on display", ctx, x, y, height, helpLine);
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
		y = this.renderHelpLine(view, "Shift 3", "-32x zoom", ctx, x, y, height, helpLine);
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
		y = this.renderHelpLine(view, "'", "tilt down", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "/", "tilt up", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// view controls, only display if not in multistate mode
		if (!view.multiStateView) {
			view.helpSections[sectionNum] = [view.lineNo, "View"];
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
		view.helpSections[sectionNum] = [view.lineNo, "Display"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Display controls:", ctx, x, y, height, helpLine);
		if (!view.multiStateView) {
			y = this.renderHelpLine(view, "G", "toggle generation statistics", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Shift G", "toggle generation display mode", ctx, x, y, height, helpLine);
			if (!view.graphDisabled) {
				y = this.renderHelpLine(view, "Y", "toggle population graph", ctx, x, y, height, helpLine);
				y = this.renderHelpLine(view, "Shift Y", "toggle graph lines", ctx, x, y, height, helpLine);
				y = this.renderHelpLine(view, "7", "decrease graph opacity", ctx, x, y, height, helpLine);
				y = this.renderHelpLine(view, "9", "increase graph opacity", ctx, x, y, height, helpLine);
			}
			y = this.renderHelpLine(view, "Shift W", "toggle performance warning", ctx, x, y, height, helpLine);
		}
		if (view.engine.isHex) {
			y = this.renderHelpLine(view, "?", "toggle hexagons for hexagonal grid", ctx, x, y, height, helpLine);
		} else {
			if (view.engine.isTriangular) {
				y = this.renderHelpLine(view, "?", "toggle triangles for triangular grid", ctx, x, y, height, helpLine);
			}
		}
		y = this.renderHelpLine(view, "T", "toggle timing information", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift T", "toggle extended timing information", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "I", "toggle pattern and engine information", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift I", "toggle information bar", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl Q", "toggle cell anti-aliasing", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Alt B", "toggle cell borders", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "X", "toggle gridlines", ctx, x, y, height, helpLine);
		if (view.engine.gridLineMajor > 0) {
			y = this.renderHelpLine(view, "Shift X", "toggle major gridlines", ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, "Ctrl G", "toggle auto gridlines", ctx, x, y, height, helpLine);
		if (view.engine.isMargolus) {
			y = this.renderHelpLine(view, "Alt D", "toggle alternating gridlines", ctx, x, y, height, helpLine);
		}
		if (view.engine.isLifeHistory || view.engine.isSuper || view.engine.multiNumStates === -1) {
			y = this.renderHelpLine(view, "Alt G", "convert pattern to [R]Super", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Alt H", "convert pattern to [R]History", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Alt J", "convert pattern to [R]Standard", ctx, x, y, height, helpLine);
		}
		if (view.waypointManager.numAnnotations() > 0) {
			y = this.renderHelpLine(view, "Alt L", "toggle annotation display", ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, "Ctrl L", "toggle kill escaping gliders", ctx, x, y, height, helpLine);
		// check if thumbnail ever on
		if (view.thumbnailEverOn) {
			y = this.renderHelpLine(view, "N", "toggle thumbnail view", ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, "S", "toggle stars", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "O", "save screenshot", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift O", "save population graph screenshot", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift U", "toggle UI", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Alt U", "toggle autohide UI during playback", ctx, x, y, height, helpLine);
		if (view.engine.multiNumStates === -1) {
			y = this.renderHelpLine(view, "Alt W", "toggle rainbow mode", ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// pattern controls
		view.helpSections[sectionNum] = [view.lineNo, "Pattern"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Pattern controls:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Alt N", "new pattern", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Alt R", "change rule", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl O", "open original or last saved pattern", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl+Shift O", "open clipboard as pattern", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl S", "save pattern", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Alt Z", "randomize pattern and rule", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl+Alt Z", "randomize pattern only", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "F6", "toggle oscillator and spaceship identification", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl F6", "fast identification", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// clipboard controls
		view.helpSections[sectionNum] = [view.lineNo, "Clipboard"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "External clipboard controls:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Alt S", "toggle sync cut and copy with external clipboard", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl+Shift C", "copy original pattern", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl C", "copy current selection", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl+Alt C", "copy current selection with comments", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl+Shift X", "cut original pattern", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl X", "cut current selection", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl+Alt X", "cut current selection with comments", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl J", "copy rule definition", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "K", "copy camera position", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift K", "copy camera position and view", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// edit controls
		view.helpSections[sectionNum] = [view.lineNo, "Edit"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Edit controls:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "F1", "toggle draw/pan mode", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "F2", "draw mode", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift F2", "toggle smart drawing", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "F3", "pick mode", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "F4", "select mode", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "F5", "pan mode", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl A", "select all", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift A", "shrink selection", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Alt A", "toggle auto-shrink selection", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl C", "copy", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl D", "toggle states display", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl I", "invert selection", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl K", "remove selection", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl V", "paste", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl+Shift V", "paste to selection", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl X", "cut", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl Y", "redo edit", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl Z", "undo edit", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl+Shift Z", "redo edit", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl Space", "advance selection", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift Space", "advance outside", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift L", "cycle paste location", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift M", "cycle paste mode", ctx, x, y, height, helpLine);
		if (view.engine.multiNumStates > 2) {
			y = this.renderHelpLine(view, "Shift 5", "multi-state random fill", ctx, x, y, height, helpLine);
			if (!view.engine.isPCA) {
				y = this.renderHelpLine(view, "Ctrl+Shift 5", "2-state random fill", ctx, x, y, height, helpLine);
			}
		} else {
			y = this.renderHelpLine(view, "Shift 5", "random fill", ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, "Alt K", "pick cell state to replace with drawing state", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Ctrl+Alt K", "clear current drawing state cells", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Del", "clear cells in selection", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift Del", "clear outside selection", ctx, x, y, height, helpLine);
		if (view.engine.isLifeHistory) {
			y = this.renderHelpLine(view, "Ctrl Del", "clear [R]History cells", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Alt Del", "clear [R]History marked cells", ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, ">", "rotate selection clockwise", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "<", "rotate selection counter-clockwise", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Alt X", "flip selection horizontally", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Alt Y", "flip selection vertically", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Alt Left", "nudge selection 1 cell left", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Alt Right", "nudge selection 1 cell right", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Alt Up", "nudge selection 1 cell up", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Alt Down", "nudge selection 1 cell down", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Esc", "hide paste", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Enter", "perform paste", ctx, x, y, height, helpLine);
		if (view.engine.isLifeHistory) {
			value = 7;
		} else {
			value = view.engine.multiNumStates === -1 ? 2 : view.engine.multiNumStates;
			if (value > 10) {
				value = 10;
			}
		}
		for (i = 0; i < value; i += 1) {
			y = this.renderHelpLine(view, "Ctrl " + i, "select state " + i + " for drawing", ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, "Shift B", "toggle clipboard library", ctx, x, y, height, helpLine);
		for (i = 0; i < 10; i += 1) {
			y = this.renderHelpLine(view, "Alt " + i, "make clipboard " + i + " active", ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// help controls
		view.helpSections[sectionNum] = [view.lineNo, "Help"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Help controls:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Up", "scroll up one line", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Down", "scroll down one line", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Page Up", "scroll up one page", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Page Down", "scroll down one page", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift Page Up", "scroll up one section", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Shift Page Down", "scroll down one section", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Home", "go to first help page", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "End", "go to last help page", ctx, x, y, height, helpLine);
	};

	// render scripts topic
	Help.renderScriptsTopic = function(view, ctx, x, y, height, helpLine) {
		// section number
		var sectionNum = 0;

		// set initial line
		view.lineNo = 1;

		// disable line wrap to start with
		view.wrapHelpText = false;

		// reset sections
		view.helpSections = [];

		// script commands
		view.tabs[0] = 252;
		view.helpSections[sectionNum] = [view.lineNo, "Top"];
		sectionNum += 1;

		y = this.renderHelpLine(view, "", "Scripts", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "Scripts must be embedded in pattern comments", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "Commands must be surrounded by whitespace", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		view.helpSections[sectionNum] = [view.lineNo, "Params"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Parameter conventions:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "A|B", "either A or B", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "(A)", "A is optional", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "A*", "zero or more A", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "A+", "one or more A", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "<1..3>", "integer range", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "<1.0..3.0>", "decimal range", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "\"<string>\"", "text string", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.variablePrefixSymbol + "B", "program build number", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.variablePrefixSymbol + "N", "pattern name", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.variablePrefixSymbol + "O", "pattern originator", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.variablePrefixSymbol + "R", "rule name", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.variablePrefixSymbol + "A", "rule alias", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.variablePrefixSymbol + "T", "program title", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.variablePrefixSymbol + "G", "current generation (Labels)", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.variablePrefixSymbol + "H", "reversible generation (Labels)", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.variablePrefixSymbol + "I", "current generation relative (Labels)", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.variablePrefixSymbol + "J", "reversible generation relative (Labels)", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.variablePrefixSymbol + "P", "current population (Labels)", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.variablePrefixSymbol + "0..9", "saved timing as average fps", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.variablePrefixSymbol + Keywords.variablePrefixSymbol, Keywords.variablePrefixSymbol + " symbol", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// script commands
		view.helpSections[sectionNum] = [view.lineNo, "General"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "General:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.scriptStartWord, "start script section", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.scriptEndWord, "end script section", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.suppressWord, "suppress overwrite warning", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		view.helpSections[sectionNum] = [view.lineNo, "Playback"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Playback:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.autoStartWord + " (" + Keywords.offWord + ")", "start play automatically", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.loopWord + " <1..>|" + Keywords.offWord, "loop at generation", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.stopWord + " <1..>|" + Keywords.offWord, "stop at generation", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.startFromWord + " <1..>", "play to generation on load", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.gpsWord + " <" + ViewConstants.minGenSpeed + ".." + view.refreshRate + ">", "set steps per second", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.stepWord + " <" + ViewConstants.minStepSpeed + ".." + ViewConstants.maxStepSpeed + ">", "set generations per step", ctx, x, y, height, helpLine);
		if ((view.engine.isMargolus || view.engine.isPCA) && view.engine.margolusReverseLookup1) {
			y = this.renderHelpLine(view, Keywords.reverseStartWord, "set initial playback to Reverse", ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, Keywords.hardResetWord, "always use hard reset", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.viewOnlyWord, "disable playback", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.noHistoryWord, "disable step back", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.noReportWord, "disable stop messages", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.noPerfWarningWord, "disable performance warning", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.noThrottleWord, "disable playback throttling", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.exclusivePlayWord, "starting playback pauses others", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.ignoreExclusiveWord, "ignore other pause requests", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.playTimeWord, "show playback duration", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		view.helpSections[sectionNum] = [view.lineNo, "Camera"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Camera:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.angleWord + " <0..359>", "set camera angle", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.tiltWord + " <0.0..5.0>", "set camera tilt", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.xWord + " <-" + (view.engine.maxGridSize >> 1) + ".." + (view.engine.maxGridSize >> 1) + ">", "set camera x position", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.yWord + " <-" + (view.engine.maxGridSize >> 1) + ".." + (view.engine.maxGridSize >> 1) + ">", "set camera y position", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.zoomWord + " <" + Number(-1 / ViewConstants.minZoom).toFixed(1) + ".." + (ViewConstants.maxZoom).toFixed(1) + ">", "set camera zoom", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.alternateZoomWord, "same as " + Keywords.zoomWord, ctx, x, y, height, helpLine);
		//y = this.renderHelpLine(view, Keywords.integerZoomWord, "enforce integer zoom", ctx, x, y, height, helpLine); TBD
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
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		view.helpSections[sectionNum] = [view.lineNo, "Waypoints"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Waypoints:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.tWord + " <0..>", "waypoint at generation", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.pauseWord + " <0.0..>", "pause for time", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.linearWord + " " + Keywords.allWord + "|" + Keywords.xWord + "|" + Keywords.yWord + "|" + Keywords.zoomWord, "linear motion", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.bezierWord + " " + Keywords.allWord + "|" + Keywords.xWord + "|" + Keywords.yWord + "|" + Keywords.zoomWord, "bezier motion (default)", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.timeIntervalWord, "save timing at waypoint start", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		view.helpSections[sectionNum] = [view.lineNo, "POIs"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Points of interest:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.poiWord, "define point of interest", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.poiTWord + " <0..>", "start POI at generation", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.poiResetWord, "reset generation at POI", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.poiPlayWord, "start playback at POI", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.poiStopWord, "stop playback at POI", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.poiTransWord + " <" + WaypointConstants.poiMinSpeed + ".." + WaypointConstants.poiMaxSpeed + ">", "set POI transition speed", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "<command>|ALL " + Keywords.initialWord, "use initial value for POI", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.stringDelimiter + "<string>" + Keywords.stringDelimiter, "define message", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.poiAddLabelsWord, "add Labels as POIs", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		view.helpSections[sectionNum] = [view.lineNo, "Annotations"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Annotations:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.labelWord + " X Y ZOOM", "define label at position", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " (" + Keywords.fixedWord + ") " + Keywords.stringDelimiter + "<string>" + Keywords.stringDelimiter, "... fix position, label text ", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.labelSizeWord + " <" + ViewConstants.minLabelSize + ".." + ViewConstants.maxLabelSize + ">", "define label font size", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " (" + Keywords.fixedWord + ")", "... optionally fix size", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.labelAlphaWord + " <0.0..1.0>", "define label font alpha", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.labelTWord + " <0..> <0..> <0..>", "generation range / fade", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.labelAngleWord + " <0..359>", "label angle", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " (" + Keywords.fixedWord + ")", "... optionally fix angle", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.labelViewWord + " D|" + Keywords.offWord, "label view distance", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.labelZoomRangeWord + " MINZOOM MAXZOOM|OFF", "label zoom visibility", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.labelTrackWord + " DX DY|" + Keywords.fixedWord, "label move per generation", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.arrowWord + " X1 Y1 X2 Y2 ZOOM", "define arrow at position", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " (" + Keywords.fixedWord + ")", "... fix position", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.arrowSizeWord + " <" + ViewConstants.minLineSize + ".." + ViewConstants.maxLineSize + "> <0.0..1.0>", "line width and head multiple", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.arrowAlphaWord + " <0.0..1.0>", "define arrow alpha", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.arrowTWord + " <0..> <0..> <0..>", "generation range / fade", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.arrowAngleWord + " <0..359>", "arrow angle", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " (" + Keywords.fixedWord + ")", "... optionally fix angle", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.arrowViewWord + " D|" + Keywords.offWord, "arrow view distance", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.arrowZoomRangeWord + " MINZOOM MAXZOOM|" + Keywords.offWord, "arrow zoom visibility", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.arrowTrackWord + " DX DY|" + Keywords.fixedWord, "arrow move per generation", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.polyLineWord + " X1 Y1 X2 Y2 .. ZOOM", "define outline polygon", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " (" + Keywords.fixedWord + ")", "... fix position", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.polyFillWord + " X1 Y1 X2 Y2 .. ZOOM", "define filled polygon", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " (" + Keywords.fixedWord + ")", "... fix position", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.polySizeWord + " <" + ViewConstants.minLineSize + ".." + ViewConstants.maxLineSize + ">", "line width", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.polyAlphaWord + " <0.0..1.0>", "define polygon alpha", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.polyTWord + " <0..> <0..> <0..>", "generation range / fade", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.polyAngleWord + " <0..359>", "polygon angle", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " (" + Keywords.fixedWord + ")", "... optionally fix angle", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.polyViewWord + " D|" + Keywords.offWord, "polygon view distance", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.polyZoomRangeWord + " MINZOOM MAXZOOM|" + Keywords.offWord, "polygon zoom visilibility", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.polyTrackWord + " DX DY|" + Keywords.fixedWord, "polygon move per generation", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		view.helpSections[sectionNum] = [view.lineNo, "Display"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Display:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.widthWord + " <" + ViewConstants.minViewerWidth + ".." + view.maxCodeWidth + ">", "set LifeViewer width", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.heightWord + " <" + ViewConstants.minViewerHeight + ".." + ViewConstants.maxViewerHeight + ">", "set LifeViewer height", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.popupWidthWord + " <" + ViewConstants.minViewerWidth + ".." + view.maxCodeWidth + ">", "set popup width", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.popupHeightWord + " <" + ViewConstants.minViewerHeight + ".." + ViewConstants.maxViewerHeight + ">", "set popup height", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.titleWord + " " + Keywords.stringDelimiter + "<string>" + Keywords.stringDelimiter, "set popup window title", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.layersWord + " <" + ViewConstants.minLayers + ".." + ViewConstants.maxLayers + ">", "set number of layers", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.depthWord + " <" + ViewConstants.minDepth.toFixed(1) + ".." + ViewConstants.maxDepth.toFixed(1) + ">", "set layer depth", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.gridWord + " (" + Keywords.offWord + ")", "display gridlines", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.gridMajorWord + " <0..16>", "set major grid line interval", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.aliveStatesWord + " <0.." + ((view.engine.multiNumStates > 2) ? 1 : 63) + ">", "number of age states to draw", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.historyStatesWord + " <0.." + ((view.engine.multiNumStates > 2) ? 1 : 63) + ">", "number of history states to draw", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.starfieldWord + " (" + Keywords.offWord + ")", "display stars", ctx, x, y, height, helpLine);
		if (view.engine.isHex) {
			y = this.renderHelpLine(view, Keywords.hexCellsWord, "hexagonal cells for grid", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, Keywords.squareCellsWord, "offset square cells for grid", ctx, x, y, height, helpLine);
		} else {
			if (view.engine.isTriangular) {
				y = this.renderHelpLine(view, Keywords.triCellsWord, "triangular cells for grid", ctx, x, y, height, helpLine);
				y = this.renderHelpLine(view, Keywords.squareCellsWord, "rectangualr cells for grid", ctx, x, y, height, helpLine);
			}
		}
		y = this.renderHelpLine(view, Keywords.bordersWord, "display cell borders", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.noGUIWord, "disable menus and hotkeys", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.hideGUIWord, "hide menus during playback", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.showTimingWord, "show timing information", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.extendedTimingWord, "extended timing information", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.showGenStatsWord, "show generation statistics", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.showInfoBarWord, "show information bar", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.rainbowWord, "use rainbow colours", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.qualityWord, "use high quality rendering", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		view.helpSections[sectionNum] = [view.lineNo, "Thumb"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Thumbnails:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.thumbnailWord + " (" + Keywords.offWord + ")", "start at 1/" + view.thumbnailDivisor + " size", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.thumbSizeWord + " <" + ViewConstants.minThumbSize + ".." + ViewConstants.maxThumbSize + ">", "set thumbnail divisor", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.thumbLaunchWord + " (" + Keywords.offWord + ")", "thumbnail launches viewer", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.thumbZoomWord + " <" + Number(-1 / ViewConstants.minZoom).toFixed(1) + ".." + (ViewConstants.maxZoom).toFixed(1) + ">", "set thumbnail zoom", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.thumbStartWord, "start playback on thumbnail expand", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		view.helpSections[sectionNum] = [view.lineNo, "Graph"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Population Graph:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.graphWord, "display population graph", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.graphOpacityWord + " <0.0..1.0>", "population graph opacity", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.graphPointsWord, "population graph use points", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.noGraphWord, "disable population graph", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		view.helpSections[sectionNum] = [view.lineNo, "Colours"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Colours:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.themeWord + " <0.." + (view.engine.numThemes - 1) + ">|name", "set theme", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " name = " + Keywords.themeCustomWord, "set custom theme", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.themeBackgroundWord + " R G B", "set theme background", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.themeAliveWord + " R G B", "set theme alive color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.themeAliveRampWord + " R G B", "set theme alive ramp", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.themeDeadWord + " R G B", "set theme dead color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.themeDeadRampWord + " R G B", "set theme dead ramp", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.themeDyingWord + " R G B", "set theme dying color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.themeDyingRampWord + " R G B", "set theme dying ramp", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.boundaryWord + " R G B", "set boundary color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " <0.." + (view.engine.multiNumStates === -1 ? (view.engine.isLifeHistory ? "6" : "1") : String(view.engine.multiNumStates - 1)) + "> R G B", "set state color", ctx, x, y, height, helpLine);
		if (view.engine.isLifeHistory) {
			y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.offColorWord + " R G B", "set [R]History state color " + ViewConstants.offState, ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.onColorWord + " R G B", "set [R]History state color " + ViewConstants.onState, ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.historyColorWord + " R G B", "set [R]History state color " + ViewConstants.historyState, ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.mark1ColorWord + " R G B", "set [R]History state color " + ViewConstants.mark1State, ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.markOffColorWord + " R G B", "set [R]History state color " + ViewConstants.markOffState, ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.mark2ColorWord + " R G B", "set [R]History state color " + ViewConstants.mark2State, ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.killColorWord + " R G B", "set [R]History state color " + ViewConstants.killState, ctx, x, y, height, helpLine);
		}
		if (view.engine.isPCA) {
			y = this.renderHelpLine(view, Keywords.colorWord + " N*E*S*W* R G B", "set PCA state color", ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.boundedWord + " R G B", "set bounded color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.selectWord + " R G B", "set select color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.pasteWord + " R G B", "set paste color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.advanceWord + " R G B", "set advance color", ctx, x, y, height, helpLine);
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
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.labelWord + " R G B", "set label text color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.arrowWord + " R G B", "set arrow line color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.polyWord + " R G B", "set polygon color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.uiFGWord + " R G B", "set UI foreground color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.uiBGWord + " R G B", "set UI background color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.uiHighlightWord + " R G B", "set UI highlight text color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.uiSelectWord + " R G B", "set UI selected color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.uiLockedWord + " R G B", "set UI locked color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colorWord + " " + Keywords.uiBorderWord + " R G B", "set UI border color", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.colourWord, "same as " + Keywords.colorWord, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		view.helpSections[sectionNum] = [view.lineNo, "Pattern"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Pattern:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.xOffsetWord + " <-" + (view.engine.maxGridSize >> 1) + ".." + (view.engine.maxGridSize >> 1) + ">", "set pattern x offset", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.yOffsetWord + " <-" + (view.engine.maxGridSize >> 1) + ".." + (view.engine.maxGridSize >> 1) + ">", "set pattern y offset", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.deleteRangeWord + " <" + ViewConstants.minDeleteRadius + ".." + ViewConstants.maxDeleteRadius + ">", "set boundary delete range", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.noCopyWord, "disable pattern source copy", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.noSourceWord, "hide pattern source", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.maxGridSizeWord + " <" + ViewConstants.minGridPower + ".." + ViewConstants.maxGridPower + ">", "set maximum grid size 2^n", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.recipeWord + " name X Y (<1..>)+", "create a named recipe", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.rleWord + " name rle", "create a named rle", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " (X Y) (TRANS)", "... X Y and transformation", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.transTypeIdentity, "identity", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.transTypeFlip, "flip", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.transTypeFlipX, "flip X", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.transTypeFlipY, "flip Y", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.transTypeSwapXY, "swap X and Y", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.transTypeSwapXYFlip, "swap X and Y and flip", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.transTypeRotateCW, "rotate clockwise", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " " + Keywords.transTypeRotateCCW, "rotate counter-clockwise", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.pasteWord + " name|rle (X Y)", "paste rle at optional X Y", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " (TRANS)", "... optional transformation", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.pasteTWord + " <0..>", "set paste generation", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "(recipe|<1..>+)*", "... optional delta list", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.pasteTWord + " " + Keywords.everyWord + " <1..>", "set paste interval", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " (<0..> (<1..>))", "... optional start and end", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.pasteDeltaWord + " X Y", "set position delta for " + Keywords.pasteTWord + " " + Keywords.everyWord, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.pasteModeWord + " <0..15>|mode", "set paste mode", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " 0   0000  " + Keywords.pasteModeZeroWord, "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " 1   0001  " + Keywords.pasteModeAndWord, "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " 2   0010  " + Keywords.pasteMode0010Word, "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " 3   0011  " + Keywords.pasteModeXWord + "|" + Keywords.pasteModeCopyWord, "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " 4   0100  " + Keywords.pasteMode0100Word, "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " 5   0101  " + Keywords.pasteModeYWord, "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " 6   0110  " + Keywords.pasteModeXorWord, "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " 7   0111  " + Keywords.pasteModeOrWord, "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " 8   1000  " + Keywords.pasteModeNOrWord, "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " 9   1001  " + Keywords.pasteModeXNOrWord, "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " 10  1010  " + Keywords.pasteModeNotYWord, "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " 11  1011  " + Keywords.pasteMode1011Word, "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " 12  1100  " + Keywords.pasteModeNotXWord, "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " 13  1101  " + Keywords.pasteMode1101Word, "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " 14  1110  " + Keywords.pasteModeNAndWord, "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " 15  1111  " + Keywords.pasteModeOneWord, "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.killGlidersWord, "suppress escaping gliders", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		view.helpSections[sectionNum] = [view.lineNo, "Randomize"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Randomize:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.randomizeWord, "create random pattern", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.randomSeedWord + " <string>", "set random seed", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.randomWidthWord + " <" + ViewConstants.minRandomWidth + ".." + ViewConstants.maxRandomWidth + ">", "set random pattern width", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.randomHeightWord + " <" + ViewConstants.minRandomHeight + ".." + ViewConstants.maxRandomHeight + ">", "set random pattern height", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.randomFillWord + " <" + ViewConstants.minRandomFill + ".." + ViewConstants.maxRandomFill + ">", "set random pattern fill percentage", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, Keywords.randomChanceWord + " " + Keywords.fixedWord, "keep rule fixed", ctx, x, y, height, helpLine);
		if (view.engine.isMargolus || view.engine.isPCA) {
			y = this.renderHelpLine(view, Keywords.randomReversibleWord, "only generate reversible rules", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, Keywords.randomSwapWord, "only generate fixed population rules", ctx, x, y, height, helpLine);
		} else {
			if (view.engine.isHROT) {
				// TBD
			} else {
				if (view.engine.wolframRule === -1) {
					y = this.renderHelpLine(view, Keywords.randomChanceWord + " <item> <0..100>", "set percentage chance for <item>", ctx, x, y, height, helpLine);
					y = this.renderHelpLine(view,  " " + Keywords.allWord, "all conditions", ctx, x, y, height, helpLine);
					y = this.renderHelpLine(view,  " " + Keywords.randomBWord, "all birth conditions", ctx, x, y, height, helpLine);
					y = this.renderHelpLine(view,  " " + Keywords.randomSWord, "all survival conditions", ctx, x, y, height, helpLine);
					y = this.renderHelpLine(view,  " " + Keywords.randomBWord + "<0..n>", "specified birth condition", ctx, x, y, height, helpLine);
					y = this.renderHelpLine(view,  " " + Keywords.randomSWord + "<0..n>", "specified survival condition", ctx, x, y, height, helpLine);
				}
			}
		}
	};

	// render information topic
	Help.renderInformationTopic = function(view, ctx, x, y, height, helpLine) {
		var i = 0, j = 0, value = 0,

			// flag
			flag = false,

			// number of Viewers
			numViewers = Controller.numViewers(),

			// get the current colour set
			colourList = view.colourList,

			// get the current theme
			theme = view.engine.themes[view.engine.colourTheme],

			// item name and details
			itemName = "",
			itemDetails = "",

			// colour rgb and name
			colourValue = "",

			// section number
			sectionNum = 0,

			// get scale
			xScale = view.viewMenu.xScale;

		// set initial line
		view.lineNo = 1;

		// disable line wrap to start with
		view.wrapHelpText = false;

		// reset sections
		view.helpSections = [];

		// information
		view.tabs[0] = 128;
		view.tabs[4] = 430;
		view.helpSections[sectionNum] = [view.lineNo, "Top"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Information", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// display information
		view.helpSections[sectionNum] = [view.lineNo, "Display"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Display:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Size", view.displayWidth + " x " + view.displayHeight, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Scale", view.viewMenu.xScale.toFixed(2), ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Pixel Ratio", view.devicePixelRatio.toFixed(2), ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Window Zoom", view.windowZoom.toFixed(2), ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Refresh", view.refreshRate + "Hz (" + ((view.lastFrame - view.firstFrame) / (ViewConstants.measureStart - 1)).toFixed(1) + "ms)", ctx, x, y, height, helpLine);
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
				itemName = "Multi-State Viewer";
			} else {
				itemName = "Viewer";
			}
		} else {
			if (view.engine.isLifeHistory) {
				itemName = "History Player";
			} else {
				itemName = "Player";
			}
		}
		if (view.isInPopup) {
			itemName += " (PopUp)";
		} else {
			itemName += " (InLine)";
		}
		y = this.renderHelpLine(view, "Type", itemName, ctx, x, y, height, helpLine);
		if (view.engine.isHex) {
			itemName = "Hexagonal";
		} else {
			if (view.engine.isTriangular) {
				itemName = "Triangular";
			} else {
				itemName = "Square";
			}
		}
		y = this.renderHelpLine(view, "Mode", itemName, ctx, x, y, height, helpLine);
		itemName = "Rectangular";
		if (view.engine.isHex && !view.engine.forceRectangles) {
			itemName = "Hexagonal";
		} else {
			if (view.engine.isTriangular && !view.engine.forceRectangles) {
				itemName = "Triangular";
			}
		}
		y = this.renderHelpLine(view, "Cells", itemName, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Quality", (view.engine.pretty ? "High" : "Standard"), ctx, x, y, height, helpLine);

		if (view.thumbnailEverOn) {
			y = this.renderHelpLine(view, "Thumbnail", "1/" + view.thumbnailDivisor, ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// pattern information
		view.helpSections[sectionNum] = [view.lineNo, "Pattern"];
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
		if (view.pasteList.length > 0) {
			y = this.renderHelpLine(view, "Pastes", view.pasteList.length, ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Paste Size", (view.pasteRightX - view.pasteLeftX + 1) + " x " + (view.pasteTopY - view.pasteBottomY + 1) + " from (" + view.pasteLeftX + ", " + view.pasteBottomY + ") to (" + view.pasteRightX + ", " + view.pasteTopY + ")", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Paste Max T", view.maxPasteGen + (view.isPasteEvery ? (" + " + Keywords.everyWord) : ""), ctx, x, y, height, helpLine);
		}
		if (view.rleList.length > 0) {
			y = this.renderHelpLine(view, "RLEs", view.rleList.length, ctx, x, y, height, helpLine);
		}
		if (view.recipeList.length > 0) {
			y = this.renderHelpLine(view, "Recipes", view.recipeList.length, ctx, x, y, height, helpLine);
		}

		y = this.renderHelpLine(view, "Offset", "X " + view.xOffset + "  Y " + view.yOffset, ctx, x, y, height, helpLine);
		if (view.genDefined) {
			y = this.renderHelpLine(view, "CXRLE Gen", view.genOffset, ctx, x, y, height, helpLine);
		}
		if (view.posDefined) {
			y = this.renderHelpLine(view, "CXRLE Pos", "X " + view.posXOffset + "  Y " + view.posYOffset, ctx, x, y, height, helpLine);
		}
		if (view.wasClipped) {
			y = this.renderHelpLine(view, "Clipped", (view.engine.boundedGridWidth === 0 ? "Inf" : view.engine.boundedGridWidth) + " x " + (view.engine.boundedGridHeight === 0 ? "Inf" : view.engine.boundedGridHeight) + " " + view.manager.boundedGridName(view.engine.boundedGridType), ctx, x, y, height, helpLine);
		}

		if (!view.executable) {
			itemName = view.patternRuleName;
			if (itemName === "") {
				itemName = "(none)";
			}
		} else {
			itemName = view.patternRuleName;
		}

		// check for MAP rule
		if (itemName.substr(0, 3) === "MAP" && itemName.length === view.manager.map512Length + 3) {
			// display on multiple lines
			y = this.renderHelpLine(view, "Rule", "MAP", ctx, x, y, height, helpLine);
			value = 3;
			while (value < view.manager.map512Length + 3) {
				y = this.renderHelpLine(view, "  " + (value - 3), itemName.substr(value, 16), ctx, x, y, height, helpLine);
				value += 16;
			}
		} else {
			// allow help to wrap short MAP or non-MAP rule
			view.wrapHelpText = true;
			y = this.renderHelpLine(view, "Rule", itemName, ctx, x, y, height, helpLine);
			view.wrapHelpText = false;
		}

		// check for alias name
		if (view.patternAliasName !== "") {
			y = this.renderHelpLine(view, "Alias", view.patternAliasName, ctx, x, y, height, helpLine);
		}

		// display type if RuleTable
		if (view.engine.isRuleTree) {
			if (view.engine.ruleTableOutput === null) {
				y = this.renderHelpLine(view, "Type", "@TREE [" + view.engine.ruleTreeNodes + "]", ctx, x, y, height, helpLine);
			} else {
				y = this.renderHelpLine(view, "Type", "@TABLE [" + view.engine.ruleTableCompressedRules + (view.engine.ruleTableDups > 0 ? " / " + view.engine.ruleTableDups : "") + "]", ctx, x, y, height, helpLine);
			}
		}

		// display neighbourhood
		if (view.engine.isMargolus) {
			itemName = "Margolus";
		} else {
			if (view.engine.wolframRule !== -1) {
				itemName = "1D";
			} else {
				if (view.engine.patternDisplayMode) {
					itemName = "Hexagonal";
					if (view.engine.hexNeighbourhood === view.manager.hexTripod || view.engine.isHROT && view.engine.HROT.type === view.manager.tripodHROT) {
						itemName = "Tripod";
					}
					if (view.engine.isHROT && view.engine.HROT.type === view.manager.asteriskHROT) {
						itemName = "Asterisk";
					}
					if (view.engine.HROT.yrange > 1) {
						itemName += " range " + view.engine.HROT.yrange;
					}
				} else {
					if (view.engine.isHROT) {
						switch(view.engine.HROT.type) {
						case view.manager.cornerEdgeHROT:
							itemName = "Corner/Edge";
							break;

						case view.manager.mooreHROT:
							itemName = "Moore";
							break;

						case view.manager.vonNeumannHROT:
							itemName = "von Neumann";
							break;

						case view.manager.circularHROT:
							itemName = "Circular";
							break;

						case view.manager.crossHROT:
							itemName = "Cross";
							break;

						case view.manager.saltireHROT:
							itemName = "Saltire";
							break;

						case view.manager.starHROT:
							itemName = "Star";
							break;

						case view.manager.l2HROT:
							itemName = "L2";
							break;

						case view.manager.hexHROT:
							itemName = "Hexagonal";
							break;

						case view.manager.checkerHROT:
							itemName = "Checkerboard";
							break;

						case view.manager.alignedCheckerHROT:
							itemName = "Aligned Checkerboard";
							break;

						case view.manager.hashHROT:
							itemName = "Hash";
							break;

						case view.manager.customHROT:
							itemName = "Custom";
							break;

						case view.manager.tripodHROT:
							itemName = "Tripod";
							break;

						case view.manager.asteriskHROT:
							itemName = "Asterisk";
							break;

						case view.manager.triangularHROT:
							itemName = "Triangular";
							break;

						case view.manager.gaussianHROT:
							itemName = "Gaussian";
							break;

						case view.manager.weightedHROT:
							itemName = "Weighted";
							break;
						}

						if (view.engine.HROT.type === view.manager.cornerEdgeHROT) {
							itemName += " range " + view.engine.HROT.cornerRange + "/" + view.engine.HROT.edgeRange;
						} else {
							if (view.engine.HROT.yrange > 1) {
								itemName += " range " + view.engine.HROT.yrange;
							}
						}
					} else {
						if (view.engine.isTriangular) {
							itemName = "Triangular";
							switch (view.engine.triangularNeighbourhood) {
								case view.manager.triangularEdges:
									itemName += " Edges";
									break;
								case view.manager.triangularVertices:
									itemName += " Vertices";
									break;
								case view.manager.triangularInner:
									itemName += " Inner";
									break;
								case view.manager.triangularOuter:
									itemName += " Outer";
									break;
							}
						} else {
							if (view.engine.isRuleTree) {
								if (view.engine.ruleTableOutput === null) {
									if (view.engine.ruleTreeNeighbours === 4) {
										itemName = "von Neumann";
									} else {
										itemName = "Moore";
									}
								} else {
									switch (view.engine.ruleTableNeighbourhood) {
									case PatternConstants.ruleTableVN:
										itemName = "von Neumann";
										break;
									case PatternConstants.ruleTableMoore:
										itemName = "Moore";
										break;
									case PatternConstants.ruleTableHex:
										itemName = "Hexagonal";
										break;
									case PatternConstants.ruleTableOneD:
										itemName = "1D";
										break;
									default:
										itemName = "unknown";
									}
								}
							} else {
								if (view.engine.isVonNeumann || view.engine.isPCA) {
									itemName = "von Neumann";
								} else {
									if (view.engine.isNone) {
										itemName = "none";
									} else {
										itemName = "Moore";
									}
								}
							}
						}
					}
				}
			}
		}
		y = this.renderHelpLine(view, "N'hood", itemName, ctx, x, y, height, helpLine);

		// output weighted neighbourhood if specified
		if (view.engine.isHROT) {
			switch (view.engine.HROT.type) {
			case view.manager.weightedHROT:
				value = view.engine.HROT.yrange * 2 + 1;
				for (i = 0; i < value; i += 1) {
					if (view.engine.HROT.customNeighbourhood.length > value * value) {
						itemName = " " + view.engine.HROT.customNeighbourhood.substr(i * value * 2, value * 2);
					} else {
						itemName = " " + view.engine.HROT.customNeighbourhood.substr(i * value, value);
					}
					y = this.renderHelpLine(view, itemName, "", ctx, x, y, height, helpLine);
				}
				break;

			case view.manager.customHROT:
				value = view.engine.HROT.yrange * 2 + 1;
				for (i = 0; i < value; i += 1) {
					itemName = " ";
					for (j = 0; j < value; j+= 1) {
						itemName += view.engine.HROT.neighbourhood[i][j] ? "1" : "0";
					}
					y = this.renderHelpLine(view, itemName, "", ctx, x, y, height, helpLine);
				}
			}

		}

		// get number of states
		itemName = view.patternStates;
		if (view.patternStates > 2 && view.patternUsedStates !== view.patternStates) {
			itemName = view.patternUsedStates + " of " + itemName;
		}
		y = this.renderHelpLine(view, "States", itemName, ctx, x, y, height, helpLine);

		// state counts
		if (view.patternStateCount) {
			for (i = 1; i < view.patternStates; i += 1) {
				if (view.patternStateCount[i]) {
					y = this.renderHelpLine(view, "State " + i, view.patternStateCount[i] + "\t" + view.getStateName(i), ctx, x, y, height, helpLine);
				}
			}
		}

		// output icon info
		if (view.engine.ruleTableIcons) {
			view.tabs[1] = 200;
			view.tabs[2] = 280;
			view.tabs[3] = 360;
			view.tabs[4] = 440;
			// check for built in icons
			if (view.engine.ruleTableIcons[0].builtIn !== PatternConstants.ruleTableIconNone) {
				y = this.renderHelpLine(view, "Icons", PatternConstants.ruleTableIconNames[view.engine.ruleTableIcons[0].builtIn], ctx, x, y, height, helpLine);
			} else {
				y = this.renderHelpLine(view, "Icons", "Size\tNumber\tColours\tGrayScale", ctx, x, y, height, helpLine);
				for (i = 0; i < view.engine.ruleTableIcons.length; i += 1) {
					value = view.engine.ruleTableIcons[i].width;
					itemName = value + "x" + value + "\t" + view.engine.ruleTableIcons[i].height / value + "\t" + view.engine.ruleTableIcons[i].numColours + "\t" + (view.engine.ruleTableIcons[i].greyScale ? "Yes" : "No");
					y = this.renderHelpLine(view, "  Set " + i, itemName, ctx, x, y, height, helpLine);
				}
			}
		}

		// output decoder used
		y = this.renderHelpLine(view, "Decoder", view.patternFormat, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// output last oscillator search result
		view.helpSections[sectionNum] = [view.lineNo, "Identify"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Identify:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Enabled", view.identify ? "Yes" : "No", ctx, x, y, height, helpLine);
		if (view.lastIdentifyType !== "none" && view.lastIdentifyType !== "Empty") {
			y = this.renderHelpLine(view, "Type", view.lastIdentifyType, ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Cells", view.lastIdentifyCells, ctx, x, y, height, helpLine);
			if (view.lastIdentifyType === "Oscillator" && !view.lastWasFast) {
				y = this.renderHelpLine(view, "ActiveCells", view.lastIdentifyActive, ctx, x, y, height, helpLine);
			}
			y = this.renderHelpLine(view, "BoundingBox", view.lastIdentifyBox, ctx, x, y, height, helpLine);
			if (view.lastIdentifyType === "Oscillator") {
				y = this.renderHelpLine(view, "Period", view.lastIdentifyPeriod, ctx, x, y, height, helpLine);
				if (!view.lastWasFast) {
					y = this.renderHelpLine(view, "Mod", view.lastIdentifyMod, ctx, x, y, height, helpLine);
				}
			} else {
				if (view.lastIdentifyType !== "Still Life") {
					y = this.renderHelpLine(view, "Direction", view.lastIdentifyDirection, ctx, x, y, height, helpLine);
					y = this.renderHelpLine(view, "Period", view.lastIdentifyPeriod, ctx, x, y, height, helpLine);
					if (!view.lastWasFast) {
						y = this.renderHelpLine(view, "Mod", view.lastIdentifyMod, ctx, x, y, height, helpLine);
					}
					y = this.renderHelpLine(view, "Slope", view.lastIdentifySlope, ctx, x, y, height, helpLine);
					y = this.renderHelpLine(view, "Speed", view.lastIdentifySpeed, ctx, x, y, height, helpLine);
				}	
			}
			if (view.lastIdentifyType !== "Still Life") {
				y = this.renderHelpLine(view, "Heat", view.lastIdentifyHeat, ctx, x, y, height, helpLine);
			}
			if (view.lastIdentifyType === "Oscillator" && !view.lastWasFast) {
				y = this.renderHelpLine(view, "Temperature", view.lastIdentifyTemperature, ctx, x, y, height, helpLine);
				y = this.renderHelpLine(view, "Volatility", view.lastIdentifyVolatility, ctx, x, y, height, helpLine);
			}
			y = this.renderHelpLine(view, "Generation", view.lastIdentifyGen, ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// grid information
		view.helpSections[sectionNum] = [view.lineNo, "Grid"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Grid:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Size", view.engine.width + " x " + view.engine.height, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Maximum", view.engine.maxGridSize + " x " + view.engine.maxGridSize, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Area", this.areaString(view), ctx, x, y, height, helpLine);
		if ((view.engine.counter & 1) !== 0) {
			y = this.renderHelpLine(view, "Tiles", (view.engine.tileCount(view.engine.nextTileGrid) + " [" + view.engine.tileCount(view.engine.staticTileGrid) + "] / " + view.engine.tileCount(view.engine.colourTileGrid) + " / " + view.engine.tileCount(view.engine.colourTileHistoryGrid)), ctx, x, y, height, helpLine);
		} else {
			y = this.renderHelpLine(view, "Tiles", (view.engine.tileCount(view.engine.tileGrid) + " [" + view.engine.tileCount(view.engine.staticTileGrid) + "] / " + view.engine.tileCount(view.engine.colourTileGrid) + " / " + view.engine.tileCount(view.engine.colourTileHistoryGrid)), ctx, x, y, height, helpLine);
		}
		if (view.engine.state6TileGrid) {
			y = this.renderHelpLine(view, "State6", view.engine.tileCount(view.engine.state6TileGrid), ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, "Tile Size", (view.engine.tileX << 3) + " x " + view.engine.tileY, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Generation", view.engine.counter, ctx, x, y, height, helpLine);
		if (view.genOffset !== 0) {
			y = this.renderHelpLine(view, "AbsoluteGen", view.engine.counter + view.genOffset, ctx, x, y, height, helpLine);
		}
		if (view.engine.isMargolus) {
			y = this.renderHelpLine(view, "MargolusGen", view.engine.counterMargolus + view.genOffset, ctx, x, y, height, helpLine);
		}
		if (view.engine.isPCA) {
			y = this.renderHelpLine(view, "PCAGen", view.engine.counterMargolus + view.genOffset, ctx, x, y, height, helpLine);
		}
		if ((view.engine.isMargolus || view.engine.isPCA) && view.engine.margolusReverseLookup1) {
			flag = view.engine.reverseMargolus;
			if (view.engine.reversePending) {
				flag = !flag;
			}
			y = this.renderHelpLine(view, "Direction", (flag ? "Reverse" : "Forward"), ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, "DeleteRange", view.engine.removePatternRadius, ctx, x, y, height, helpLine);
		if (view.engine.clearGliders) {
			y = this.renderHelpLine(view, "KillGliders", view.engine.numClearedGliders, ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// bounded grid information
		if (view.engine.boundedGridType !== -1) {
			view.helpSections[sectionNum] = [view.lineNo, "Bounded"];
			sectionNum += 1;
			y = this.renderHelpLine(view, "", "Bounded grid:", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Type", view.manager.boundedGridName(view.engine.boundedGridType), ctx, x, y, height, helpLine);
			if (view.engine.boundedGridWidth === 0) {
				y = this.renderHelpLine(view, "Width", "Infinite", ctx, x, y, height, helpLine);
			} else {
				y = this.renderHelpLine(view, "Width", view.engine.boundedGridWidth, ctx, x, y, height, helpLine);
			}
			// sphere only has width
			if (view.engine.boundedGridType !== 4) {
				if (view.engine.boundedGridHeight === 0) {
					y = this.renderHelpLine(view, "Height", "Infinite", ctx, x, y, height, helpLine);
				} else {
					y = this.renderHelpLine(view, "Height", view.engine.boundedGridHeight, ctx, x, y, height, helpLine);
				}

				// klein bottle has twist
				if (view.engine.boundedGridType === 2) {
					if (view.engine.boundedGridHorizontalTwist) {
						y = this.renderHelpLine(view, "Twist", "Horizontal", ctx, x, y, height, helpLine);
					} else {
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
		view.helpSections[sectionNum] = [view.lineNo, "AutoFit"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "AutoFit:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Enabled", view.autoFit ? "On" : "Off", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Mode", this.autoFitName(view), ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// track
		view.helpSections[sectionNum] = [view.lineNo, "Track"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Track:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Enabled", (view.trackDefined && !view.trackDisabled) ? "On" : "Off", ctx, x, y, height, helpLine);
		if (view.trackDefined) {
			if (view.trackBoxDefined) {
				y = this.renderHelpLine(view, "Mode", "Track Box", ctx, x, y, height, helpLine);
				y = this.renderHelpLine(view, "Definition", "E " + view.trackBoxE.toFixed(3) + "  S " + view.trackBoxS.toFixed(3) + "  W " + view.trackBoxW.toFixed(3) + "  N " + view.trackBoxN.toFixed(3), ctx, x, y, height, helpLine);
			} else {
				y = this.renderHelpLine(view, "Mode", "Track", ctx, x, y, height, helpLine);
				y = this.renderHelpLine(view, "Definition", "X " + view.trackBoxE.toFixed(3) + "  Y " + view.trackBoxS.toFixed(3), ctx, x, y, height, helpLine);
			}
		}
		y = this.renderHelpLine(view, "Current", "E " + view.currentTrackSpeedE.toFixed(3) + "  S " + view.currentTrackSpeedS.toFixed(3) + "  W " + view.currentTrackSpeedW.toFixed(3) + "  N " + view.currentTrackSpeedN.toFixed(3), ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// snapshot information
		view.helpSections[sectionNum] = [view.lineNo, "Undo/Redo"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Undo/Redo:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Enabled", view.noHistory ? "Off" : "On", ctx, x, y, height, helpLine);
		if (!view.noHistory) {
			y = this.renderHelpLine(view, "Snapshots", view.engine.snapshotManager.usedBuffers() + "/" + view.engine.snapshotManager.buffers(), ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Buffer", (view.engine.snapshotManager.bufferSize() >> 10) + "K", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Next Gen", view.engine.nextSnapshotTarget, ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Undo", view.editNum, ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Redo", view.numEdits - view.editNum, ctx, x, y, height, helpLine);
			for (i = 0; i <= 9; i += 1) {
				if (view.pasteBuffers[i] !== null) {
					y = this.renderHelpLine(view, "Clip " + i + (i === view.currentPasteBuffer ? "*" : ""), view.pasteBuffers[i].width + " x " + view.pasteBuffers[i].height, ctx, x, y, height, helpLine);
				}
			}
		}
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// engine information
		view.helpSections[sectionNum] = [view.lineNo, "Engine"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Engine:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Name", ViewConstants.externalViewerTitle, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Build", ViewConstants.versionBuild, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Author", ViewConstants.versionAuthor, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Decoders", "RLE, Life 1.06, Life 1.05, Cells", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "N'hoods", "Moore, Hexagonal, von Neumann, Triangular, 1D,", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " ", "Circular, Cross, L2, Saltire, Star, Checkerboard,", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " ", "Aligned Checkerboard, Hash, Tripod, Asterisk,", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " ", "Far Corners/Edges and Custom (CoordCA)", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Rules", "Wolfram, Totalistic, Generations, Margolus,", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " ", "Isotropic Non-Totalistic (Hensel, Callahan),", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " ", "Alternating, MAP, Larger than Life (LtL),", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " ", "Higher-range outer-totalistic (HROT), Gaussian,", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " ", "Partitioned cellular automata (PCA), Weighted,", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " ", "[R]History and [R]Super", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Repository", "RuleTable (@TABLE, @TREE, @COLORS and", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, " ", "@NAMES)", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "BoundedGrid", "Plane, Torus, Klein, Cross-surface and Sphere", ctx, x, y, height, helpLine);

		y = this.renderHelpLine(view, "Viewers", numViewers, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Playing", Controller.viewersPlaying(), ctx, x, y, height, helpLine);
		if (DocConfig.multi) {
			value = Controller.patterns.length;
			y = this.renderHelpLine(view, "Universe", "Multi (" + (view.universe + 1) + " of " + value + ")", ctx, x, y, height, helpLine);
			// wrap long rule names
			view.wrapHelpText = true;
			for (i = 0; i < value; i += 1) {
				y = this.renderHelpLine(view, (String(i + 1) + ((i === view.universe) ? "*" : "")), Controller.patterns[i].name, ctx, x, y, height, helpLine);
				y = this.renderHelpLine(view, " ", Controller.patterns[i].rule, ctx, x, y, height, helpLine);
				y = this.renderHelpLine(view, " ", Controller.patterns[i].width + " x " + Controller.patterns[i].height, ctx, x, y, height, helpLine);
			}
			view.wrapHelpText = false;
		} else {
			y = this.renderHelpLine(view, "Universe", "Single", ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, "Exclusive", (view.exclusivePlayback ? "Yes": "No"), ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "IgnorePause", (view.ignorePauseRequests ? "Yes": "No"), ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Endian", (littleEndian ? "Little": "Big"), ctx, x, y, height, helpLine);
		// @ts-ignore
		y = this.renderHelpLine(view, "ArrayFill", (arrayFill ? "Yes": "No"), ctx, x, y, height, helpLine);
		// @ts-ignore
		y = this.renderHelpLine(view, "ArraySlice", (arraySlice ? "Yes": "No"), ctx, x, y, height, helpLine);
		// @ts-ignore
		y = this.renderHelpLine(view, "CopyWithin", (copyWithin ? "Yes": "No"), ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// rule cache
		view.tabs[1] = 300;
		view.tabs[2] = 380;
		view.tabs[3] = 460;
		view.helpSections[sectionNum] = [view.lineNo, "Rule Cache"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Rule Cache:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Entries", RuleTreeCache.rules.length, ctx, x, y, height, helpLine);
		if (RuleTreeCache.rules.length > 0) {
			y = this.renderHelpLine(view, "Entry", "Name\tSize Kb\tFetch\tDecode", ctx, x, y, height, helpLine);
			for (i = 0; i < RuleTreeCache.rules.length; i += 1) {
				itemName = RuleTreeCache.rules[i].name;
				if (itemName.length > 17) {
					itemName = itemName.substr(0,17) + "*";
				}
				y = this.renderHelpLine(view, String(i), itemName + "\t" + (RuleTreeCache.meta[i].size >> 10) + "\t" + RuleTreeCache.meta[i].fetch + "ms\t" + RuleTreeCache.meta[i].decode + "ms", ctx, x, y, height, helpLine);
			}
		}
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// colour set information
		view.tabs[1] = 210;
		view.tabs[2] = 270;
		view.tabs[3] = 330;
		if (view.engine.isNone) {
			view.helpSections[sectionNum] = [view.lineNo, "Colours"];
			sectionNum += 1;
			y = this.renderHelpLine(view, "", "Set:", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Name", view.colourSetName, ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Used", view.patternUsedStates, ctx, x, y, height, helpLine);
			for (i = 0; i < view.customColourUsed.length; i += 1) {
				// check if the state is used
				if (view.customColourUsed[i] !== ViewConstants.stateNotUsed) {
					// get colour value
					colourValue = this.rgbString((colourList[i] >> 16) & 255, (colourList[i] >> 8) & 255, colourList[i] & 255);
					itemName = String(i);
					
					// if the colour is custom (but the whole set isn't custom) then add a star to the name
					if (view.customColourUsed[i] === ViewConstants.stateUsedCustom && !view.allCustom) {
						itemName += "*";
					}

					// render the colour box
					this.renderColourBox(view, colourList[i] >> 16, (colourList[i] >> 8) & 255, colourList[i] & 255, ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
					y = this.renderHelpLine(view, itemName, colourValue, ctx, x, y, height, helpLine);
				}
			}
		} else {
			// colour theme information
			view.helpSections[sectionNum] = [view.lineNo, "Theme"];
			sectionNum += 1;
			y = this.renderHelpLine(view, "", "Theme:", ctx, x, y, height, helpLine);
			if (!(view.engine.isRuleTree || view.engine.isSuper)) {
				y = this.renderHelpLine(view, "Name", view.engine.themes[view.engine.colourTheme].name, ctx, x, y, height, helpLine);
				y = this.renderHelpLine(view, "History", view.historyStates, ctx, x, y, height, helpLine);
				if (view.engine.multiNumStates <= 2) {
					y = this.renderHelpLine(view, "Age", view.aliveStates, ctx, x, y, height, helpLine);
				}
			}
			this.renderColourBox(view, view.engine.redChannel[0], view.engine.greenChannel[0], view.engine.blueChannel[0], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
			y = this.renderHelpLine(view, "Background", this.rgbString(view.engine.redChannel[0], view.engine.greenChannel[0], view.engine.blueChannel[0]), ctx, x, y, height, helpLine);

			// check for none rule
			if (view.engine.isNone || view.engine.isRuleTree) {
				for (i = 1; i < view.engine.multiNumStates; i += 1) {
					this.renderColourBox(view, view.engine.redChannel[i], view.engine.greenChannel[i], view.engine.blueChannel[i], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
					y = this.renderHelpLine(view, "State " + i, this.rgbString(view.engine.redChannel[i], view.engine.greenChannel[i], view.engine.blueChannel[i]), ctx, x, y, height, helpLine);
				}
			} else {
				// check for PCA rules
				if (view.engine.isPCA) {
					for (i = 1; i < 16; i += 1) {
						j = i + view.historyStates;
						this.renderColourBox(view, view.engine.redChannel[j], view.engine.greenChannel[j], view.engine.blueChannel[j], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
						itemName = "";
						if (i & 1) {
							itemName += "N";
						}
						if (i & 2) {
							itemName += "E";
						}
						if (i & 4) {
							itemName += "S";
						}
						if (i & 8) {
							itemName += "W";
						}
						y = this.renderHelpLine(view, itemName, this.rgbString(view.engine.redChannel[j], view.engine.greenChannel[j], view.engine.blueChannel[j]), ctx, x, y, height, helpLine);
					}
					if (view.historyStates > 0) {
						j = view.historyStates;
						this.renderColourBox(view, view.engine.redChannel[j], view.engine.greenChannel[j], view.engine.blueChannel[j], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
						y = this.renderHelpLine(view, "Dead", this.rgbString(view.engine.redChannel[j], view.engine.greenChannel[j], view.engine.blueChannel[j]), ctx, x, y, height, helpLine);
						if (view.historyStates > 1) {
							j = 1;
							this.renderColourBox(view, view.engine.redChannel[j], view.engine.greenChannel[j], view.engine.blueChannel[j], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
							y = this.renderHelpLine(view, "DeadRamp", this.rgbString(view.engine.redChannel[j], view.engine.greenChannel[j], view.engine.blueChannel[j]), ctx, x, y, height, helpLine);
						}
					}
				} else {
					// check for Generations, HROT or Super rules
					if (view.engine.multiNumStates > 2) {
						if (view.engine.isSuper) {
							for (i = 1; i < view.engine.multiNumStates; i += 1) {
								this.renderColourBox(view, view.engine.redChannel[i], view.engine.greenChannel[i], view.engine.blueChannel[i], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
								y = this.renderHelpLine(view, this.superName(i), this.rgbString(view.engine.redChannel[i], view.engine.greenChannel[i], view.engine.blueChannel[i]), ctx, x, y, height, helpLine);
							}
						} else {
							// draw the alive state
							j = view.engine.multiNumStates + view.historyStates - 1; 
							this.renderColourBox(view, view.engine.redChannel[j], view.engine.greenChannel[j], view.engine.blueChannel[j], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
							y = this.renderHelpLine(view, "Alive", this.rgbString(view.engine.redChannel[j], view.engine.greenChannel[j], view.engine.blueChannel[j]), ctx, x, y, height, helpLine);
			
							// draw dying states
							for (i = 1; i < view.engine.multiNumStates - 1; i += 1) {
								j = view.engine.multiNumStates - i + view.historyStates - 1;
								this.renderColourBox(view, view.engine.redChannel[j], view.engine.greenChannel[j], view.engine.blueChannel[j], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
								y = this.renderHelpLine(view, "Dying " + i, this.rgbString(view.engine.redChannel[j], view.engine.greenChannel[j], view.engine.blueChannel[j]), ctx, x, y, height, helpLine);
							}
							if (view.historyStates > 0) {
								j = view.historyStates;
								this.renderColourBox(view, view.engine.redChannel[j], view.engine.greenChannel[j], view.engine.blueChannel[j], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
								y = this.renderHelpLine(view, "Dead", this.rgbString(view.engine.redChannel[j], view.engine.greenChannel[j], view.engine.blueChannel[j]), ctx, x, y, height, helpLine);
								if (view.historyStates > 1) {
									j = 1;
									this.renderColourBox(view, view.engine.redChannel[j], view.engine.greenChannel[j], view.engine.blueChannel[j], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
									y = this.renderHelpLine(view, "DeadRamp", this.rgbString(view.engine.redChannel[j], view.engine.greenChannel[j], view.engine.blueChannel[j]), ctx, x, y, height, helpLine);
								}
							}
						}
					} else {
						// normal theme
						this.renderColourBox(view, theme.aliveRange.startColour.red, theme.aliveRange.startColour.green, theme.aliveRange.startColour.blue, ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
						y = this.renderHelpLine(view, "Alive", this.rgbObjectString(theme.aliveRange.startColour), ctx, x, y, height, helpLine);
		
						// check if there is a ramp between alive start and end
						if (theme.aliveRange.startColour.red !== theme.aliveRange.endColour.red || theme.aliveRange.startColour.green !== theme.aliveRange.endColour.green || theme.aliveRange.startColour.blue !== theme.aliveRange.endColour.blue) {
							this.renderColourBox(view, theme.aliveRange.endColour.red, theme.aliveRange.endColour.green, theme.aliveRange.endColour.blue, ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
							y = this.renderHelpLine(view, "AliveRamp", this.rgbObjectString(theme.aliveRange.endColour), ctx, x, y, height, helpLine);
						} else {
							y = this.renderHelpLine(view, "AliveRamp", "    (none)", ctx, x, y, height, helpLine);
						}
		
						// if there are no history states don't draw dead states
						if (view.historyStates > 0) {
							this.renderColourBox(view, theme.deadRange.endColour.red, theme.deadRange.endColour.green, theme.deadRange.endColour.blue, ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
							y = this.renderHelpLine(view, "Dead", this.rgbObjectString(theme.deadRange.endColour), ctx, x, y, height, helpLine);
		
							// check if there is a ramp between dead start and end
							if (view.historyStates > 1) {
								if (theme.deadRange.startColour.red !== theme.deadRange.endColour.red || theme.deadRange.startColour.green !== theme.deadRange.endColour.green || theme.deadRange.startColour.blue !== theme.deadRange.endColour.blue) {
									this.renderColourBox(view, theme.deadRange.startColour.red, theme.deadRange.startColour.green, theme.deadRange.startColour.blue, ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
									y = this.renderHelpLine(view, "DeadRamp", this.rgbObjectString(theme.deadRange.startColour), ctx, x, y, height, helpLine);
								} else {
									y = this.renderHelpLine(view, "DeadRamp", "    (none)", ctx, x, y, height, helpLine);
								}
							}
						}
					}
				}
			}
	
			// check for History rules
			if (view.engine.isLifeHistory) {
				for (i = 3; i <= 6; i += 1) {
					value = 128 + ViewConstants.stateMap[i];
					colourValue = this.rgbString(view.engine.redChannel[value], view.engine.greenChannel[value], view.engine.blueChannel[value]);
					itemName = ViewConstants.stateNames[i];
					
					// render the colour boX
					this.renderColourBox(view, view.engine.redChannel[value], view.engine.greenChannel[value], view.engine.blueChannel[value], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
					y = this.renderHelpLine(view, itemName, colourValue, ctx, x, y, height, helpLine);
				}
			}
		}

		// check for bounded grid
		if (view.engine.gridType !== -1) {
			// display bounded colour
			if (view.engine.boundedGridType !== -1 && (view.engine.multiNumStates + view.engine.historyStates < 256)) {
				this.renderColourBox(view, view.customBoundedColour[0], view.customBoundedColour[1], view.customBoundedColour[2], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
				y = this.renderHelpLine(view, "Bounded", this.rgbString(view.customBoundedColour[0], view.customBoundedColour[1], view.customBoundedColour[2]), ctx, x, y, height, helpLine);
			} else {
				this.renderColourBox(view, view.engine.redChannel[2], view.engine.greenChannel[2], view.engine.blueChannel[2], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
				y = this.renderHelpLine(view, "Bounded*", this.rgbString(view.engine.redChannel[2], view.engine.greenChannel[2], view.engine.blueChannel[2]), ctx, x, y, height, helpLine);
			}
		}

		// display boundary colour
		this.renderColourBox(view, view.customBoundaryColour[0], view.customBoundaryColour[1], view.customBoundaryColour[2], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
		y = this.renderHelpLine(view, "Boundary", this.rgbString(view.customBoundaryColour[0], view.customBoundaryColour[1], view.customBoundaryColour[2]), ctx, x, y, height, helpLine);

		// display text colour
		if (view.customTextColour) {
			this.renderColourBox(view, view.customTextColour[0], view.customTextColour[1], view.customTextColour[2], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
			y = this.renderHelpLine(view, "Text*", this.rgbString(view.customTextColour[0], view.customTextColour[1], view.customTextColour[2]), ctx, x, y, height, helpLine);
		} else {
			this.renderColourBox(view, 255, 255, 255, ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
			y = this.renderHelpLine(view, "Text", this.rgbString(255, 255, 255), ctx, x, y, height, helpLine);
		}

		// display error text colour
		if (view.customErrorColour) {
			this.renderColourBox(view, view.customErrorColour[0], view.customErrorColour[1], view.customErrorColour[2], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
			y = this.renderHelpLine(view, "Error*", this.rgbString(view.customErrorColour[0], view.customErrorColour[1], view.customErrorColour[2]), ctx, x, y, height, helpLine);
		} else {
			this.renderColourBox(view, 255, 96, 96, ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
			y = this.renderHelpLine(view, "Error", this.rgbString(255, 96, 96), ctx, x, y, height, helpLine);
		}

		// select, paste and advance colours
		this.renderColourBox(view, view.customSelectColour[0], view.customSelectColour[1], view.customSelectColour[2], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
		y = this.renderHelpLine(view, "Select", this.rgbString(view.customSelectColour[0], view.customSelectColour[1], view.customSelectColour[2]), ctx, x, y, height, helpLine);
		this.renderColourBox(view, view.customPasteColour[0], view.customPasteColour[1], view.customPasteColour[2], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
		y = this.renderHelpLine(view, "Paste", this.rgbString(view.customPasteColour[0], view.customPasteColour[1], view.customPasteColour[2]), ctx, x, y, height, helpLine);
		this.renderColourBox(view, view.customAdvanceColour[0], view.customAdvanceColour[1], view.customAdvanceColour[2], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
		y = this.renderHelpLine(view, "Advance", this.rgbString(view.customAdvanceColour[0], view.customAdvanceColour[1], view.customAdvanceColour[2]), ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// grid line information
		view.helpSections[sectionNum] = [view.lineNo, "Gridlines"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Gridlines:", ctx, x, y, height, helpLine);
		itemName = view.engine.displayGrid ? "On" : "Off";
		if (view.engine.displayGrid && !view.engine.canDisplayGrid()) {
			itemName += " (Hidden)";
		}
		y = this.renderHelpLine(view, "Enabled", itemName, ctx, x, y, height, helpLine);

		// display grid line colour
		this.renderColourBox(view, view.engine.gridLineRaw >> 16, (view.engine.gridLineRaw >> 8) & 255, view.engine.gridLineRaw & 255, ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
		y = this.renderHelpLine(view, "Line Color", this.rgbString(view.engine.gridLineRaw >> 16, (view.engine.gridLineRaw >> 8) & 255, view.engine.gridLineRaw & 255), ctx, x, y, height, helpLine);

		// display grid line major colour
		this.renderColourBox(view, view.engine.gridLineBoldRaw >> 16, (view.engine.gridLineBoldRaw >> 8) & 255, view.engine.gridLineBoldRaw & 255, ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
		y = this.renderHelpLine(view, "Major Color", this.rgbString(view.engine.gridLineBoldRaw >> 16, (view.engine.gridLineBoldRaw >> 8) & 255, view.engine.gridLineBoldRaw & 255), ctx, x, y, height, helpLine);

		// grid line major interval
		if (view.engine.gridLineMajor > 0 && view.engine.gridLineMajorEnabled) {
			itemName = String(view.engine.gridLineMajor);
		} else {
			itemName = "Off";
		}
		y = this.renderHelpLine(view, "Interval", itemName, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// population graph information
		view.helpSections[sectionNum] = [view.lineNo, "Graph"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Population Graph:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Enabled", view.popGraph ? "On" : "Off", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Disabled", view.graphDisabled ? "On" : "Off", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Mode", view.popGraphLines ? "Lines" : "Points", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Opacity", view.popGraphOpacity.toFixed(2), ctx, x, y, height, helpLine);
		this.renderColourBox(view, view.engine.graphBgColor[0], view.engine.graphBgColor[1], view.engine.graphBgColor[2], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
		y = this.renderHelpLine(view, "Bg Color", this.rgbString(view.engine.graphBgColor[0], view.engine.graphBgColor[1], view.engine.graphBgColor[2]), ctx, x, y, height, helpLine);
		this.renderColourBox(view, view.engine.graphAxisColor[0], view.engine.graphAxisColor[1], view.engine.graphAxisColor[2], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
		y = this.renderHelpLine(view, "Axis Color", this.rgbString(view.engine.graphAxisColor[0], view.engine.graphAxisColor[1], view.engine.graphAxisColor[2]), ctx, x, y, height, helpLine);
		this.renderColourBox(view, view.engine.graphAliveColor[0], view.engine.graphAliveColor[1], view.engine.graphAliveColor[2], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
		y = this.renderHelpLine(view, "Alive Color", this.rgbString(view.engine.graphAliveColor[0], view.engine.graphAliveColor[1], view.engine.graphAliveColor[2]), ctx, x, y, height, helpLine);
		this.renderColourBox(view, view.engine.graphBirthColor[0], view.engine.graphBirthColor[1], view.engine.graphBirthColor[2], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
		y = this.renderHelpLine(view, "Birth Color", this.rgbString(view.engine.graphBirthColor[0], view.engine.graphBirthColor[1], view.engine.graphBirthColor[2]), ctx, x, y, height, helpLine);
		this.renderColourBox(view, view.engine.graphDeathColor[0], view.engine.graphDeathColor[1], view.engine.graphDeathColor[2], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
		y = this.renderHelpLine(view, "Death Color", this.rgbString(view.engine.graphDeathColor[0], view.engine.graphDeathColor[1], view.engine.graphDeathColor[2]), ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// random parameter information
		view.helpSections[sectionNum] = [view.lineNo, "Randomize"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Randomize:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Pattern", view.randomizePattern ? "On" : "Off", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Custom Seed", view.randomSeedCustom ? "On" : "Off", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Seed", view.randomSeed, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Width", view.randomWidth, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Height", view.randomHeight, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Fill", view.randomFillPercentage + "%", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Rule Fixed", view.randomRuleFixed ? "Yes" : "No", ctx, x, y, height, helpLine);
		if (!view.randomRuleFixed) {
			if (view.engine.isMargolus || view.engine.isPCA) {
				y = this.renderHelpLine(view, "Reversible", (view.randomReversible ? "Only" : "Any"), ctx, x, y, height, helpLine);
				y = this.renderHelpLine(view, "FixedPop", (view.randomSwap ? "Yes" : "No"), ctx, x, y, height, helpLine);
			} else {
				if (view.engine.isHROT) {
					// TBD
				} else {
					if (view.engine.wolframRule === -1) {
						if (view.randomChanceB === -1 && view.randomChanceS === -1) {
							y = this.renderHelpLine(view, "Chance ALL" + (view.randomChanceAll === -1 ? "*" : ""), (view.randomChanceAll === -1 ? "50%" : view.randomChanceAll + "%"), ctx, x, y, height, helpLine);
							// check for default B0
							flag = false;
							for (i = 0; i < view.randomChanceBN.length; i += 2) {
								if (view.randomChanceBN[i] === 0) {
									flag = true;
								}
							}
							if (!flag) {
								y = this.renderHelpLine(view, "Chance B0*", "25%" , ctx, x, y, height, helpLine);
							}
						} else {
							y = this.renderHelpLine(view, "Chance B" + (view.randomChanceB === -1 ? "*" : ""), (view.randomChanceB === -1 ? "50%" : view.randomChanceB + "%"), ctx, x, y, height, helpLine);
							y = this.renderHelpLine(view, "Chance S" + (view.randomChanceS === -1 ? "*" : ""), (view.randomChanceS === -1 ? "50%" : view.randomChanceS + "%"), ctx, x, y, height, helpLine);
						}
						for (i = 0; i < view.randomChanceBN.length; i += 2) {
							y = this.renderHelpLine(view, "Chance B" + view.randomChanceBN[i], view.randomChanceBN[i + 1] + "%", ctx, x, y, height, helpLine);
						}
						for (i = 0; i < view.randomChanceSN.length; i += 2) {
							y = this.renderHelpLine(view, "Chance S" + view.randomChanceSN[i], view.randomChanceSN[i + 1] + "%", ctx, x, y, height, helpLine);
						}
					}
				}
			}
		}
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// starfield information
		view.helpSections[sectionNum] = [view.lineNo, "Stars"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Stars:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Enabled", view.starsOn ? "On" : "Off", ctx, x, y, height, helpLine);

		this.renderColourBox(view, view.starField.red, view.starField.green, view.starField.blue, ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
		y = this.renderHelpLine(view, "Color", this.rgbObjectString(view.starField), ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// script information
		view.helpSections[sectionNum] = [view.lineNo, "Script"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Script:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Commands", view.numScriptCommands, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Errors", view.numScriptErrors, ctx, x, y, height, helpLine);

		// waypoints
		if (view.waypointsDefined) {
			y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
			view.helpSections[sectionNum] = [view.lineNo, "Waypoints"];
			sectionNum += 1;
			y = this.renderHelpLine(view, "", "Waypoints:", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Enabled", view.waypointsDisabled ? "Off" : "On", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Number", view.waypointManager.numWaypoints(), ctx, x, y, height, helpLine);
			for (i = 0; i < view.waypointManager.numWaypoints(); i += 1) {
				itemName = String(i);

				// check for current waypoint
				if (i === view.waypointManager.tempIndex) {
					// check if at last waypoint
					if (view.waypointManager.atLast(view.elapsedTime)) {
						itemName += ">";
					} else {
						itemName += "*";
					}
				}
				y = this.renderHelpLine(view, itemName, view.waypointManager.waypointAsText(i, Keywords.stringDelimiter), ctx, x, y, height, helpLine);
			}
		}

		// points of interest
		if (view.waypointManager.numPOIs()) {
			y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
			view.helpSections[sectionNum] = [view.lineNo, "POIs"];
			sectionNum += 1;
			y = this.renderHelpLine(view, "", "Points of interest:", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Number", view.waypointManager.numPOIs(), ctx, x, y, height, helpLine);
			for (i = 0; i < view.waypointManager.numPOIs(); i += 1) {
				itemName = String(i + 1);
				if (i === view.currentPOI) {
					itemName += "*";
				}
				if (i === view.defaultPOI) {
					itemName += " INITIAL";
				}
				flag = false;
				itemDetails = view.waypointManager.poiCameraAsText(i);
				if (itemDetails !== "") {
					y = this.renderHelpLine(view, (flag ? " " : itemName), (flag ? "  " : "") + itemDetails, ctx, x, y, height, helpLine);
					flag = true;
				}
				itemDetails = view.waypointManager.poiThemeDepthLayerAsText(i);
				if (itemDetails !== "") {
					y = this.renderHelpLine(view, (flag ? " " : itemName), (flag ? "  " : "") + itemDetails, ctx, x, y, height, helpLine);
					flag = true;
				}
				itemDetails = view.waypointManager.poiLoopStopGpsStepAsText(i);
				if (itemDetails !== "") {
					y = this.renderHelpLine(view, (flag ? " " : itemName), (flag ? "  " : "") + itemDetails, ctx, x, y, height, helpLine);
					flag = true;
				}
				itemDetails = view.waypointManager.poiActionAsText(i);
				if (itemDetails !== "") {
					y = this.renderHelpLine(view, (flag ? " " : itemName), (flag ? "  " : "") + itemDetails, ctx, x, y, height, helpLine);
					flag = true;
				}
				itemDetails = view.waypointManager.poiStartGenAsText(i);
				if (itemDetails !== "") {
					y = this.renderHelpLine(view, (flag ? " " : itemName), (flag ? "  " : "") + itemDetails, ctx, x, y, height, helpLine);
					flag = true;
				}
				itemDetails = view.waypointManager.poiMessageAsText(i, Keywords.stringDelimiter);
				if (itemDetails !== "") {
					y = this.renderHelpLine(view, (flag ? " " : itemName), (flag ? "  " : "") + itemDetails, ctx, x, y, height, helpLine);
					flag = true;
				}
			}
		}
	};

	// render themes topic
	Help.renderThemesTopic = function(view, ctx, x, y, height, helpLine) {
		var i = 0,

			// get the current theme
			theme = view.engine.themes[view.engine.colourTheme],

			// section number
			sectionNum = 0,

			// get scale
			xScale = view.viewMenu.xScale;

		// set initial line
		view.lineNo = 1;

		// disable line wrap to start with
		view.wrapHelpText = false;

		// reset sections
		view.helpSections = [];
		
		// themes list
		view.tabs[0] = 130;
		view.tabs[1] = 200;
		view.tabs[2] = 250;
		view.tabs[3] = 300;
		view.tabs[4] = 380;
		view.helpSections[sectionNum] = [view.lineNo, "Top"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Themes", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "Themes are used to provide a visual representation of", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "cell history and longevity and also define grid colours", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		view.helpSections[sectionNum] = [view.lineNo, "Grid"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Grid:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "GRID", "grid line colour", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "GRIDMAJOR", "major grid line colour and interval", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		view.helpSections[sectionNum] = [view.lineNo, "2-State"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Two-state Themes:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "BACKGROUND", "cell never occupied", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "ALIVE", "cell just born", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "ALIVERAMP", "cell alive for several generations", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "DEAD", "cell just died", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "DEADRAMP", "cell dead for several generations", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", view.aliveStates + " (" + Keywords.aliveStatesWord + ") states from ALIVE to ALIVERAMP", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", view.historyStates + " (" + Keywords.historyStatesWord + ") states from DEAD to DEADRAMP", ctx, x, y, height, helpLine);

		// draw each 2-state theme except the custom theme
		for (i = 0; i < view.engine.themes.length - 1; i += 1) {
			y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
			theme = view.engine.themes[i];
			// draw theme name with a '*' if it is the current theme
			y = this.renderHelpLine(view, "Name" + ((i === view.engine.colourTheme && view.engine.multiNumStates <= 2) ? "*" : ""), theme.name, ctx, x, y, height, helpLine);
			// background colour
			this.renderColourBox(view, theme.unoccupied.red, theme.unoccupied.green, theme.unoccupied.blue, ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
			y = this.renderHelpLine(view, "BACKGROUND", this.rgbObjectString(theme.unoccupied), ctx, x, y, height, helpLine);
			// alive colour
			this.renderColourBox(view, theme.aliveRange.startColour.red, theme.aliveRange.startColour.green, theme.aliveRange.startColour.blue, ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
			y = this.renderHelpLine(view, "ALIVE", this.rgbObjectString(theme.aliveRange.startColour), ctx, x, y, height, helpLine);
			// alive ramp if different than alive
			if (!(theme.aliveRange.startColour.red === theme.aliveRange.endColour.red && theme.aliveRange.startColour.green === theme.aliveRange.endColour.green && theme.aliveRange.startColour.blue === theme.aliveRange.endColour.blue)) {
				this.renderColourBox(view, theme.aliveRange.endColour.red, theme.aliveRange.endColour.green, theme.aliveRange.endColour.blue, ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
				y = this.renderHelpLine(view, "ALIVERAMP", this.rgbObjectString(theme.aliveRange.endColour), ctx, x, y, height, helpLine);
			}
			// dead colour
			this.renderColourBox(view, theme.deadRange.endColour.red, theme.deadRange.endColour.green, theme.deadRange.endColour.blue, ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
			y = this.renderHelpLine(view, "DEAD", this.rgbObjectString(theme.deadRange.endColour), ctx, x, y, height, helpLine);
			// dead ramp if different than dead
			if (!(theme.deadRange.startColour.red === theme.deadRange.endColour.red && theme.deadRange.startColour.green === theme.deadRange.endColour.green && theme.deadRange.startColour.blue === theme.deadRange.endColour.blue)) {
				this.renderColourBox(view, theme.deadRange.startColour.red, theme.deadRange.startColour.green, theme.deadRange.startColour.blue, ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
				y = this.renderHelpLine(view, "DEADRAMP", this.rgbObjectString(theme.deadRange.startColour), ctx, x, y, height, helpLine);
			}
			// check if grid lines are customised
			if (theme.gridDefined) {
				// grid line colour
				this.renderColourBox(view, theme.gridColour >> 16, (theme.gridColour >> 8) & 255, theme.gridColour & 255, ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
				y = this.renderHelpLine(view, "GRID", this.rgbString(theme.gridColour >> 16, (theme.gridColour >> 8) & 255, theme.gridColour & 255), ctx, x, y, height, helpLine);
				// major grid line colour
				this.renderColourBox(view, theme.gridMajorColour >> 16, (theme.gridMajorColour >> 8) & 255, theme.gridMajorColour & 255, ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
				y = this.renderHelpLine(view, "GRIDMAJOR", this.rgbString(theme.gridMajorColour >> 16, (theme.gridMajorColour >> 8) & 255, theme.gridMajorColour & 255), ctx, x, y, height, helpLine);
				// major grid line interval
				y = this.renderHelpLine(view, "GRIDMAJOR", theme.gridMajor, ctx, x, y, height, helpLine);
			}
		}

		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		view.helpSections[sectionNum] = [view.lineNo, "Multi"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Multi-state Themes:", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "BACKGROUND", "cell never occupied", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "ALIVE", "cell alive", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "DYING", "cell just starting dying", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "DYINGRAMP", "cell about to die", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "DEAD", "cell just died", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "DEADRAMP", "cell dead for several generations", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "Rule defines " + (view.engine.multiNumStates < 2 ? "" : String(view.engine.multiNumStates - 1) + " ") + "states from DYING to DYINGRAMP", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", view.historyStates + " (HISTORYSTATES) states from DEAD to DEADRAMP", ctx, x, y, height, helpLine);

		// draw each multi-state theme except the custom theme
		for (i = 0; i < view.engine.themes.length - 1; i += 1) {
			y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
			theme = view.engine.themes[i];
			// draw theme name with a '*' if it is the current theme
			y = this.renderHelpLine(view, "Name" + ((i === view.engine.colourTheme && view.engine.multiNumStates > 2) ? "*" : ""), theme.name, ctx, x, y, height, helpLine);
			// background colour
			this.renderColourBox(view, theme.unoccupiedGen.red, theme.unoccupiedGen.green, theme.unoccupiedGen.blue, ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
			y = this.renderHelpLine(view, "BACKGROUND", this.rgbObjectString(theme.unoccupiedGen), ctx, x, y, height, helpLine);
			// alive colour
			this.renderColourBox(view, theme.aliveGen.red, theme.aliveGen.green, theme.aliveGen.blue, ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
			y = this.renderHelpLine(view, "ALIVE", this.rgbObjectString(theme.aliveGen), ctx, x, y, height, helpLine);
			// dying colour
			this.renderColourBox(view, theme.dyingRangeGen.endColour.red, theme.dyingRangeGen.endColour.green, theme.dyingRangeGen.endColour.blue, ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
			y = this.renderHelpLine(view, "DYING", this.rgbObjectString(theme.dyingRangeGen.endColour), ctx, x, y, height, helpLine);
			// dead ramp if different than dead
			if (!(theme.dyingRangeGen.startColour.red === theme.dyingRangeGen.endColour.red && theme.dyingRangeGen.startColour.green === theme.dyingRangeGen.endColour.green && theme.dyingRangeGen.startColour.blue === theme.dyingRangeGen.endColour.blue)) {
				this.renderColourBox(view, theme.dyingRangeGen.startColour.red, theme.dyingRangeGen.startColour.green, theme.dyingRangeGen.startColour.blue, ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
				y = this.renderHelpLine(view, "DYINGRAMP", this.rgbObjectString(theme.dyingRangeGen.startColour), ctx, x, y, height, helpLine);
			}
			// dead colour
			this.renderColourBox(view, theme.deadRangeGen.endColour.red, theme.deadRangeGen.endColour.green, theme.deadRangeGen.endColour.blue, ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
			y = this.renderHelpLine(view, "DEAD", this.rgbObjectString(theme.deadRangeGen.endColour), ctx, x, y, height, helpLine);
			// dead ramp if different than dead
			if (!(theme.deadRangeGen.startColour.red === theme.deadRangeGen.endColour.red && theme.deadRangeGen.startColour.green === theme.deadRangeGen.endColour.green && theme.deadRangeGen.startColour.blue === theme.deadRangeGen.endColour.blue)) {
				this.renderColourBox(view, theme.deadRangeGen.startColour.red, theme.deadRangeGen.startColour.green, theme.deadRangeGen.startColour.blue, ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
				y = this.renderHelpLine(view, "DEADRAMP", this.rgbObjectString(theme.deadRangeGen.startColour), ctx, x, y, height, helpLine);
			}
		}
	};

	// render colours topic
	Help.renderColoursTopic = function(view, ctx, x, y, height, helpLine) {
		var i = 0,

			// get the named colour list
			cmList = ColourManager.colourList,
			keys = Object.keys(cmList),
			namedCol = null,

			// section number
			sectionNum = 0,

			// scale
			xScale = view.viewMenu.xScale;

		// set initial line
		view.lineNo = 1;

		// disable line wrap to start with
		view.wrapHelpText = false;

		// reset sections
		view.helpSections = [];
		
		// display colour names
		view.tabs[0] = 260;
		view.tabs[1] = 330;
		view.tabs[2] = 380;
		view.tabs[3] = 430;
		// hide the colour name from renderColourBox off the display since the name is already drawn
		view.tabs[4] = view.displayWidth;
		view.helpSections[sectionNum] = [view.lineNo, "Top"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Colours", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "The following names can be used in place of R G B", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "for example [[ COLOUR ALIVE Green ]]", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		for (i = 0; i < keys.length; i += 1) {
			namedCol = cmList[keys[i]];
			this.renderColourBox(view, namedCol[1], namedCol[2], namedCol[3], ctx, x + (view.tabs[0] * xScale), y, height, helpLine);
			y = this.renderHelpLine(view, namedCol[0], this.rgbString(namedCol[1], namedCol[2], namedCol[3]), ctx, x, y, height, helpLine);
		}
	};

	// render aliases topic
	Help.renderAliasesTopic = function(view, ctx, x, y, height, helpLine) {
		var i = 0,

		    // section number
		    sectionNum = 0,

			// aliases
			aliases = AliasManager.aliases,

			// alias section names
			sectionNames = AliasManager.sectionNames;

		// set initial line
		view.lineNo = 1;

		// disable line wrap to start with
		view.wrapHelpText = false;

		// reset sections
		view.helpSections = [];

		// aliases
		view.tabs[0] = 260;
		view.helpSections[sectionNum] = [view.lineNo, "Top"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Aliases", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "Alias names can be used as rule names in RLE", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "for example 'rule = HighLife'", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "* denotes duplicate definition", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "+ denotes duplicate alias name", ctx, x, y, height, helpLine);

		// display alias table
		view.wrapHelpText = true;
		for (i = 0; i < aliases.length; i += 1) {
			// check for category
			if (aliases[i][1] === "") {
				// render category
				y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
				view.helpSections[sectionNum] = [view.lineNo, sectionNames[sectionNum - 1]];
				sectionNum += 1;
				y = this.renderHelpLine(view, "", aliases[i][0] + " Aliases:", ctx, x, y, height, helpLine);
			} else {
				// check for default alias
				if (aliases[i][0] !== "") {
					// render non-default alias
					y = this.renderHelpLine(view, aliases[i][0] + " " + (aliases[i][2] ? "*" : "") + (aliases[i][3] ? "+" : ""), aliases[i][1], ctx, x, y, height, helpLine);
				}
			}
		}
	};

	// render memory topic
	Help.renderMemoryTopic = function(view, ctx, x, y, height, helpLine) {
		var i = 0,

			// section number
			sectionNum = 0,

			// memory aggregation
			numViewers = Controller.numViewers(),
			allocs = 0,
			frees = 0,
			totalBytes = 0,
			totalFreedBytes = 0,

			// one of the running Viewers
			currentView = null;

		// set initial line
		view.lineNo = 1;

		// disable line wrap to start with
		view.wrapHelpText = false;

		// reset sections
		view.helpSections = [];
		
		// memory
		view.tabs[0] = 128;
		view.tabs[1] = 200;
		view.tabs[2] = 290;
		view.tabs[3] = 530;
		view.helpSections[sectionNum] = [view.lineNo, "Top"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Memory usage", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);

		// display aggregate data if more than one LifeViewer
		if (numViewers > 1) {
			view.helpSections[sectionNum] = [view.lineNo, "All"];
			sectionNum += 1;
			y = this.renderHelpLine(view, "", "Memory (all " + numViewers + " LifeViewers):", ctx, x, y, height, helpLine);
			// get allocation data for each viewer
			for (i = 0; i < numViewers; i += 1) {
				currentView = Controller.getView(i);
				if (currentView) {
					// add in Kbytes to prevent integer overflow
					allocs += currentView.engine.allocator.numAllocs;
					totalBytes += (currentView.engine.allocator.totalBytes >> 10);
					frees += currentView.engine.allocator.numFrees;
					totalFreedBytes += (currentView.engine.allocator.totalFreedBytes >> 10);
				}
			}
			// display aggregate information
			y = this.renderHelpLine(view, "In Use", (allocs - frees) + "\t" + ((totalBytes >> 10) - (totalFreedBytes >> 10)) + "M", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Allocations", allocs + "\t" + (totalBytes >> 10) + "M", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "Frees", frees + "\t" + (totalFreedBytes >> 10) + "M", ctx, x, y, height, helpLine);
			y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
		} 

		// display current LifeViewer data
		view.helpSections[sectionNum] = [view.lineNo, "Current"];
		sectionNum += 1;
		y = this.renderHelpLine(view, "", "Memory (this LifeViewer):", ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "In Use", (view.engine.allocator.numAllocs - view.engine.allocator.numFrees) + "\t" + this.asMByte(view.engine.allocator.totalBytes - view.engine.allocator.totalFreedBytes) + "M\t" + (view.engine.allocator.totalBytes - view.engine.allocator.totalFreedBytes), ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Allocations", view.engine.allocator.numAllocs + "\t" + this.asMByte(view.engine.allocator.totalBytes) + "M\t" + view.engine.allocator.totalBytes, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, "Frees", view.engine.allocator.numFrees + "\t" + this.asMByte(view.engine.allocator.totalFreedBytes) + "M\t" + view.engine.allocator.totalFreedBytes, ctx, x, y, height, helpLine);
		y = this.renderHelpLine(view, this.pad("Bytes", 10), "Type\tElements\tName\tCount", ctx, x, y, height, helpLine);
		for (i = 0; i < view.engine.allocator.allocations.length; i += 1) {
			y = this.renderHelpLine(view, this.pad(String(view.engine.allocator.allocations[i].size), 10), view.engine.allocator.allocationInfo(i), ctx, x, y, height, helpLine);
		}
		y = this.renderHelpLine(view, "", "", ctx, x, y, height, helpLine);
	};

	// draw help text
	Help.drawHelpText = function(view) {
		var ctx = view.mainContext,

			// scale
			xScale = view.viewMenu.xScale,
			yScale = view.viewMenu.yScale,

			// line height
		    lineHeight = 19 * yScale;

		// compute the number of lines that will fit on the page
		view.numHelpPerPage = ((view.displayHeight / lineHeight) | 0) - 6;

		// dim background
		ctx.fillStyle = "black";
		ctx.globalAlpha = 0.5;
		ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
		ctx.globalAlpha = 1;

		// draw shadow
		ctx.fillStyle = ViewConstants.helpShadowColour; 
		this.shadowX = 2;
		Help.renderHelpText(view, ctx, 6 * xScale, 14 * yScale, lineHeight, view.displayHelp | 0);

		// draw text
		ctx.fillStyle = ViewConstants.helpFontColour;
		this.shadowX = 0;
		Help.renderHelpText(view, ctx, 6 * xScale, 14 * yScale, lineHeight, view.displayHelp | 0);
	};

	// render error with up down greyed based on position
	Help.renderErrorLineUpDown = function(view, up, separator, down, error, ctx, x, y, height, startLine) {
		var result = y,

			// scale
			xScale = view.viewMenu.xScale,
			yScale = view.viewMenu.xScale,

			// shadow
			shadowX = this.shadowX * xScale,
			shadowY = this.shadowX * yScale,

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
			ctx.font = view.helpFixedFont;

			// set colour based on whether errors can scroll up
			if (!drawingShadow) {
				if ((view.displayErrors | 0) > 1) {
					ctx.fillStyle = view.errorsFontColour;
				} else {
					ctx.fillStyle = ViewConstants.greyFontColour;
				}
			}
			ctx.fillText(up, x + shadowX, y + shadowY);

			// draw the separator
			if (!drawingShadow) {
				ctx.fillStyle = view.errorsFontColour;
			}
			ctx.fillText(separator, x + shadowX + ctx.measureText(up).width, y + shadowY);

			// set colour based on whether errors can scroll down
			if (!drawingShadow) {
				if ((view.displayErrors | 0) < view.scriptErrors.length - view.numHelpPerPage + 1) {
					ctx.fillStyle = view.errorsFontColour;
				} else {
					ctx.fillStyle = ViewConstants.greyFontColour;
				}
			}
			ctx.fillText(down, x + shadowX + ctx.measureText(up + separator).width, y + shadowY);

			// use tab width rather than command width if specified
			if (view.tabs[0]) {
				width = view.tabs[0] * xScale;
			}

			// draw error message
			if (!drawingShadow) {
				ctx.fillStyle = view.errorsFontColour;
			}
			ctx.font = view.helpVariableFont;
			ctx.fillText(error, x + shadowX + width, y + shadowY);

			// move the y coordinate to the next screen line
			result += height;
		}

		// return the next y coordinate
		return result;
	};

	// render error
	Help.renderErrorLine = function(view, command, error, ctx, x, y, height, startLine) {
		var result = y,

			// scale
			xScale = view.viewMenu.xScale,

		    // get the width of the command
		    width = 0,

		    // line number
		    lineNo = view.lineNo;

		// check if the line on the page
		if (lineNo >= startLine && lineNo <= (startLine + view.numHelpPerPage)) {
			// draw command if supplied
			if (command.length) {
				ctx.font = view.helpFixedFont;
				ctx.fillText(command, x, y);
				width = ctx.measureText(command + " ").width;
			}

			// use tab width rather than command width if specified
			if (view.tabs[0]) {
				width = view.tabs[0] * xScale;
			}

			// draw error message
			ctx.font = view.helpVariableFont;
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
		ctx.font = view.helpVariableFont;
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
		var ctx = view.mainContext,

			// scale
			xScale = view.viewMenu.xScale,
			yScale = view.viewMenu.yScale,

		    // text line height in pixels
		    lineHeight = 19 * yScale,

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
		this.renderErrors(view, ctx, 6 * xScale, 14 * yScale, lineHeight, view.displayErrors | 0);

		// draw text
		ctx.fillStyle = view.errorsFontColour;
		this.renderErrors(view, ctx, 4 * xScale, 12 * yScale, lineHeight, view.displayErrors | 0);
	};

	/*jshint -W069 */
	window['Help'] = Help;
}
());

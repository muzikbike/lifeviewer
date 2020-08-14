// LifeViewer Keyboard Handling
// written by Chris Rowett

(function() {
	// use strict mode
	"use strict";

	// define globals
	/* global hideViewer Controller DocConfig ViewConstants */

	// key processor
	var KeyProcessor = {};

	// process keys in copy clipboard mode
	KeyProcessor.processKeyCopy = function(me, keyCode, event) {
		// flag event processed
		var processed = true;

		// check for control-R which would refresh browser
		if (event.ctrlKey && keyCode === 82) {
			return true;
		}

		// determine if the key can be processed
		switch (keyCode) {
		// return for copy
		case 13:
			if (me.tempRLEAmount === me.tempRLELength) {
				me.completeCopyToClipboard(me, true);
			}
			break;

		// t for timing display
		case 84:
			// toggle fps
			me.viewFpsToggle([!me.menuManager.showTiming], true, me);
			break;

		// ignore other keys
		default:
			// flag not handled
			processed = false;
			break;
		}

		// return whether key processed
		return processed;
	};

	// process keys in identify mode
	KeyProcessor.processKeyIdentify = function(me, keyCode, event) {
		// flag event processed
		var processed = true;

		// check for control, meta or alt
		if (event.ctrlKey || event.metaKey || event.altKey) {
			// clear key code so it is not handled here
			keyCode = -1;
		}

		// determine if the key can be processed
		switch (keyCode) {
		// t for timing display
		case 84:
			// toggle fps
			me.viewFpsToggle([!me.menuManager.showTiming], true, me);
			break;

		// Esc f6 to cancel Identify
		case 27:
		case 117:
			me.identifyPressed(me);
			break;

		// ignore other keys
		default:
			// flag not handled
			processed = false;
			break;
		}

		// return whether key processed
		return processed;
	};

	// process keys in history mode
	KeyProcessor.processKeyHistory = function(me, keyCode, event) {
		// flag event processed
		var processed = true;

		// check for control, meta or alt
		if (event.ctrlKey || event.metaKey || event.altKey) {
			// clear key code so it is not handled here
			keyCode = -1;
		}

		// determine if the key can be processed
		switch (keyCode) {
		// t for timing display
		case 84:
			// toggle fps
			me.viewFpsToggle([!me.menuManager.showTiming], true, me);
			break;

		// ignore other keys
		default:
			// flag not handled
			processed = false;
			break;
		}

		// return whether key processed
		return processed;
	};

	// process key
	KeyProcessor.processKey = function(me, keyCode, event) {
		// flag event processed
		var processed = true,

		    // value for changes
			value = 0;

		// check if gui enabled
		if (me.noGUI) {
			// gui disabled so check if NOGUI was defined
			if (!me.noGUIDefined) {
				// user disabled the GUI so check for toggle key shift and 'u'
				if (keyCode === 85 && event.shiftKey) {
					me.noGUI = !me.noGUI;
					me.viewMenu.deleted = me.noGUI;
					me.menuManager.noGUI = me.noGUI;
				}
			}
		} else {
			// convert control-arrow keys into PageUp/PageDown/Home/End
			if (event.ctrlKey && !event.altKey && (keyCode >= 37 && keyCode <= 40)) {
				if (keyCode === 37) {
					keyCode = 33;
				} else if (keyCode === 38)  {
					keyCode = 36;
				} else if (keyCode === 39)  {
					keyCode = 34;
				} else if (keyCode === 40)  {
					keyCode = 35;
				}
			}

			// check for alt-number
			if (event.altKey && !event.ctrlKey) {
				if (keyCode >= 48 && keyCode <= 57) {
					value = keyCode - 48;
					// if selecting or no POIs then choose clipboard
					if (me.selecting || me.waypointManager.numPOIs() === 0) {
						// if clipboard already selected then paste
						if (me.currentPasteBuffer === value) {
							if (me.isPasting) {
								me.pasteSelection(me);
							} else {
								me.pastePressed(me);
							}
						} else {
							// switch to required buffer
							me.clipboardList.current = me.viewClipboardList(value, true, me);
						}
					} else {
						// POIs only use 1 to 9
						value -= 1;
						if (value >= 0 && value < me.waypointManager.numPOIs()) {
							me.currentPOI = value;
	
							// set camera
							me.setCameraFromPOI(me, me.currentPOI);
						}
					}
				} else {
					switch (keyCode) {
					// left for nudge left
					case 37:
						me.pasteOffset(me, -1, 0);
						break;
					// up for nudge up
					case 38:
						me.pasteOffset(me, 0, -1);
						break;
					// right for nudge right
					case 39:
						me.pasteOffset(me, 1, 0);
						break;
					// down for nudge down
					case 40:
						me.pasteOffset(me, 0, 1);
						break;
					// Del for clear marked [R]History cells
					case 46:
						me.clearCells(me, true, true);
						me.menuManager.notification.notify("Cleared [R]History marked cells", 15, 120, 15, true);
						break;
					// a for auto-shrink
					case 65:
						// toggle auto-shrink selection
						me.autoShrinkToggle.current = me.viewAutoShrinkList([!me.autoShrink], true, me);
						me.menuManager.notification.notify("Auto-Shrink Selection " + (me.autoShrink ? "On" : "Off"), 15, 40, 15, true);
						break;

					// b for cell borders
					case 66:
						// toggle cell borders
						me.bordersButton.current = me.viewBordersToggle([!me.engine.cellBorders], true, me);
						break;

					// c for default theme
					case 67:
						// set default theme
						if (!me.multiStateView) {
							if (me.themeButton && !me.themeButton.locked) {
								me.setNewTheme(me.defaultTheme, me.engine.colourChangeSteps, me);
								if (!me.engine.isNone && !me.showThemeSelection) {
									me.menuManager.notification.notify(me.themeName(me.engine.colourTheme) + " Theme", 15, 40, 15, true);
								}
							}
						}
						break;

					// d for toggle alternating grid
					case 68:
						if (me.engine.isMargolus) {
							me.altGridButton.current = me.viewAltGridToggle([!me.engine.altGrid], true, me);
							me.menuManager.notification.notify("Alternating Gridlines " + (me.engine.altGrid ? "On" : "Off"), 15, 40, 15, true);
						}
						break;

					// g for toggle kill gliders
					case 71:
						// toggle kill gliders
						me.engine.clearGliders = !me.engine.clearGliders;
						me.menuManager.notification.notify("Kill Gliders " + (me.engine.clearGliders ? "On" : "Off"), 15, 40, 15, true);
						break;

					// h for [R]History on
					case 72:
						if (me.engine.isLifeHistory) {
							me.engine.displayLifeHistory = true;
							me.engine.drawOverlay = true;
							me.menuManager.notification.notify("[R]History Display " + (me.engine.displayLifeHistory ? "On" : "Off"), 15, 40, 15, true);
						}
						break;

					// j for [R]History off
					case 74:
						if (me.engine.isLifeHistory) {
							me.engine.displayLifeHistory = false;
							me.engine.drawOverlay = false;
							me.menuManager.notification.notify("[R]History Display " + (me.engine.displayLifeHistory ? "On" : "Off"), 15, 40, 15, true);
						}
						break;

					// k for replace selected cell state with drawing state
					case 75:
						// switch to draw mode
						if (me.modeList.current !== ViewConstants.modeDraw) {
							me.modeList.current = me.viewModeList(ViewConstants.modeDraw, true, me);
						}
						// enable pick replace
						me.pickReplace = true;
						me.pickToggle.current = me.togglePick([true], true, me);
						break;

					// l for toggle annotations
					case 76:
						// toggle annotations
						if (me.waypointManager.numAnnotations() > 0) {
							me.labelButton.current = me.viewLabelToggle([!me.showLabels], true, me);
							me.menuManager.notification.notify("Annotations " + (me.showLabels ? "On" : "Off"), 15, 40, 15, true);
						}
						break;

					// n for new pattern
					case 78:
						// new pattern
						me.newPattern(me);
						break;

					// o for toggle autostart
					case 79:
						// toggle autostart
						if (me.autoStart) {
							me.autoStartDisabled = !me.autoStartDisabled;
							me.autostartIndicator.current = [me.autoStartDisabled];
							me.menuManager.notification.notify("AutoStart " + (me.autoStartDisabled ? "Off" : "On"), 15, 40, 15, true);
						}
						break;

					// o for toggle stop
					case 80:
						// toggle stop
						if (me.stopGeneration !== -1) {
							me.stopDisabled = !me.stopDisabled;
							me.stopIndicator.current = [me.stopDisabled];
							me.menuManager.notification.notify("Stop " + (me.stopDisabled ? "Off" : "On"), 15, 40, 15, true);
						}
						break;

					// r for change rule
					case 82:
						// change rule
						me.changeRule(me);
						break;

					// s for toggle sync
					case 83:
						// toggle external clipboard sync
						me.copySyncToggle.current = me.viewCopySyncList([!me.copySyncExternal], true, me);
						me.menuManager.notification.notify("Sync Clipboard " + (me.copySyncExternal ? "On" : "Off"), 15, 40, 15, true);
						break;

					// t for toggle throttling
					case 84:
						me.throttleToggle.current = me.toggleThrottle([!me.canBailOut], true, me);
						me.menuManager.notification.notify("Throttling " + (me.canBailOut ? "On" : "Off"), 15, 40, 15, true);
						break;

					// x for flip X
					case 88:
						// flip selection horizontally
						me.flipXPressed(me);
						break;

					// y for flip Y
					case 89:
						// flip selection vertically
						me.flipYPressed(me);
						break;

					// z for randomize
					case 90:
						// randomize rule and pattern
						if (!me.randomizeButton.locked) {
							me.randomPattern(me, false);
						}
						break;
					}
				}

				// clear keyCode so it is not handled here
				keyCode = -2;
			}

			// determine if the key can be processed
			switch (keyCode) {
			// '/' for toggle hex
			case 191:
			case 111: // num /
				// switch between hexagonal and square cells for hex display
				if (me.engine.isHex) {
					me.hexCellButton.current = me.viewHexCellToggle([!me.engine.useHexagons], true, me);
					me.menuManager.notification.notify("Hex display uses " + (me.engine.useHexagons ? "Hexagons" : "Squares"), 15, 40, 15, true);
				}
				break;

			// backspace for back one step
			case 8:
				// do not move if in view only mode
				if (!me.viewOnly) {
					// check control is not locked
					if (!me.playList.itemLocked[1]) {
						value = me.gensPerStep;
						me.gensPerStep = 1;
						me.playList.current = me.viewPlayList(ViewConstants.modeStepBack, true, me);
						me.gensPerStep = value;
					}
				}
				break;

			// b for back one step
			case 66:
				// check for ctrl
				if (event.ctrlKey) {
					// copy neighbourhood to clipboard from selection
					me.copyNeighbourhood(me);
				} else {
					// do not move if in view only mode
					if (!me.viewOnly) {
						// check control is not locked
						if (!me.playList.itemLocked[1]) {
							value = me.gensPerStep;
							me.gensPerStep = 1;
							me.playList.current = me.viewPlayList(ViewConstants.modeStepBack, true, me);
							me.gensPerStep = value;
						}
					}
				}
				break;

			// return for play/pause
			case 13:
				if (me.isPasting || me.evolvingPaste) {
					me.pasteFromEnter(me);
				} else {
					// do not play if view only mode
					if (!me.viewOnly) {
						// check if not playing
						if (me.playList.current === ViewConstants.modePlay) {
							// switch to pause
							me.playList.current = me.viewPlayList(ViewConstants.modePlay, true, me);
						} else {
							// check for drawing and mouse down
							if (!(me.drawing && me.menuManager.mouseDown)) {
								// switch to play
								me.playList.current = me.viewPlayList(ViewConstants.modePlay, true, me);
							}
						}
					}
				}
				break;

			// tab for pause/next step
			case 9:
				// do not pause if view only mode
				if (!me.viewOnly) {
					// check if playing
					if (me.generationOn) {
						// pause
						me.playList.current = me.viewPlayList(ViewConstants.modePause, true, me);
					} else {
						// check for shift key
						if (event.shiftKey) {
							// check for reversible Margolus or PCA patterns
							if ((me.engine.isMargolus || me.engine.isPCA) && me.engine.margolusReverseLookup1 !== null) {
								me.playList.current = me.viewPlayList(ViewConstants.modeStepBack, true, me);
							} else {
								// step back if not at start
								if (me.engine.counter > 0) {
									// run from start to previous step
									me.runTo(me.engine.counter - me.gensPerStep);
	
									// adjust undo stack pointer
									me.setUndoGen(me.engine.counter - me.gensPerStep + 1);
								}
							}
						} else {
							// step forward
							me.nextStep = true;
							me.afterEdit("");
						}
					}
				}
				break;

			// space for pause/next generation
			case 32:
				// do not pause if view only mode
				if (!me.viewOnly) {
					// check if playing
					if (me.generationOn) {
						// pause
						me.playList.current = me.viewPlayList(ViewConstants.modePause, true, me);
					} else {
						// check for ctrl
						if (event.ctrlKey || event.shiftKey) {
							me.evolvePressed(me, event.ctrlKey, event.shiftKey);
						} else {
							// next generation
							me.nextStep = true;
							me.singleStep = true;
							me.afterEdit("");
						}
					}
				}
				break;

			// w for toggle waypoint/track/loop mode
			case 87:
				if (event.shiftKey) {
					me.showLagToggle.current = me.toggleShowLag([!me.perfWarning], true, me);
					me.menuManager.notification.notify("Performance Warning " + (me.perfWarning ? "On" : "Off"), 15, 40, 15, true);
				} else {
					if (me.trackDefined) {
						me.waypointsIndicator.current = me.toggleWP([me.trackDisabled], true, me);
					} else {
						if (me.waypointsDefined) {
							me.waypointsIndicator.current = me.toggleWP([me.waypointsDisabled], true, me);
						}
					}
				}
				break;

			// e for increase step size
			case 69:
				// increase step size
				if (!me.stepRange.locked) {
					if (me.gensPerStep < ViewConstants.maxStepSpeed) {
						// check for shift
						if (event.shiftKey) {
							// go to maximum step
							me.gensPerStep = ViewConstants.maxStepSpeed;
						} else {
							// increase step
							me.gensPerStep += 1;
						}
						me.stepRange.current = me.viewStepRange([me.gensPerStep, me.gensPerStep], true, me);
					}
				}
				break;

			// d for decrease step size
			case 68:
				// decrease step size
				if (!me.stepRange.locked) {
					if (me.gensPerStep > ViewConstants.minStepSpeed) {
						// check for shift
						if (event.shiftKey) {
							// go to minimum step
							me.gensPerStep = ViewConstants.minStepSpeed;
						} else {
							// decrease step
							me.gensPerStep -= 1;
						}
						me.stepRange.current = me.viewStepRange([me.gensPerStep, me.gensPerStep], true, me);
					}
				}
				break;

			// z for stop other viewers
			case 90:
				// check for control
				if (event.ctrlKey) {
					if (event.altKey) {
						if (!me.randomizeButton.locked) {
							me.randomPattern(me, true);
						}
					}
					// check for shift
					if (event.shiftKey) {
						// redo edit
						me.redo(me);
					} else {
						// undo edit
						if (!me.undoButton.locked) {
							me.undo(me);
						}
					}
				} else {
					// check for shift
					if (event.shiftKey) {
						// stop all viewers
						value = Controller.stopAllViewers();
						if (value === 0) {
							me.menuManager.notification.notify("No LifeViewers playing", 15, 100, 15, true);
						} else {
							if (value > 1) {
								me.menuManager.notification.notify("Paused all LifeViewers", 15, 100, 15, true);
							}
						}
					} else {
						// stop other viewers
						value = Controller.stopOtherViewers(me);
						if (value > 0) {
							if (value > 1) {
								me.menuManager.notification.notify("Paused " + value + " other LifeViewers", 15, 100, 15, true);
							} else {
								me.menuManager.notification.notify("Paused " + value + " other LifeViewer", 15, 100, 15, true);
							}
						}
					}
				}
				break;

			// x for toggle grid lines
			case 88:
				if (event.ctrlKey) {
					me.processCut(me, event.shiftKey, event.altKey);
				} else {
					// check for shift
					if (event.shiftKey) {
						// toggle major grid lines
						me.majorButton.current = me.viewMajorToggle([!me.engine.gridLineMajorEnabled], true, me);
						if (me.engine.gridLineMajor > 0) {
							me.menuManager.notification.notify("Major Grid Lines " + (me.engine.gridLineMajorEnabled ? "On" : "Off"), 15, 40, 15, true);
							me.clearHelpCache();
						}
					} else {
						// toggle grid
						me.engine.displayGrid = !me.engine.displayGrid;
						me.gridToggle.current = me.toggleGrid([me.engine.displayGrid], true, me);
						me.menuManager.notification.notify("Grid Lines " + (me.engine.displayGrid ? "On" : "Off"), 15, 40, 15, true);
					}
				}
				break;

			// y for toggle graph
			case 89:
				if (event.ctrlKey) {
					me.redo(me);
				} else {
					// check if graph disabled
					if (me.graphDisabled) {
						me.menuManager.notification.notify("Graph Disabled", 15, 40, 15, true);
					} else {
						// check for shift
						if (event.shiftKey) {
							// toggle lines
							me.popGraphLines = !me.popGraphLines;
							me.linesToggle.current = me.toggleLines([me.popGraphLines], true, me);
							me.menuManager.notification.notify("Graph " + (me.popGraphLines ? "Lines" : "Points"), 15, 40, 15, true);
						} else {
							// toggle population graph
							me.popGraph = !me.popGraph;
							me.graphButton.current = me.viewGraphToggle([me.popGraph], true, me);
							me.menuManager.notification.notify("Population Graph " + (me.popGraph ? "On" : "Off"), 15, 40, 15, true);
						}
					}
				}
				break;

			// k for copy position to clipboard
			case 75:
				// check for ctrl
				if (event.ctrlKey) {
					if (event.altKey) {
						me.clearCells(me, false, false);
						value = me.drawState;
						if (me.engine.multiNumStates > 2 && !(me.engine.isPCA || me.engine.isRuleTree) && value > 0) {
							value = me.engine.multiNumStates - value;
						}
						if (me.engine.isRuleTree) {
							me.menuManager.notification.notify("Cleared state " + value + " cells", 15, 120, 15, true);
						} else {
							me.menuManager.notification.notify("Cleared " + me.getStateName(value) + " cells", 15, 120, 15, true);
						}
					} else {
						// remove selection
						me.removeSelection(me);
					}
				} else {
					// check for shift
					if (event.shiftKey) {
						// copy view
						me.copyPosition(me, true);
						me.menuManager.notification.notify("Copied view to clipboard", 15, 180, 15, true);
					} else {
						// copy position
						me.copyPosition(me, false);
						me.menuManager.notification.notify("Copied position to clipboard", 15, 180, 15, true);
					}
				}
				break;

			// p for increase depth or toggle loop
			case 80:
				// check for shift
				if (event.shiftKey) {
					if (me.loopGeneration !== -1) {
						// toggle loop mode
						me.loopDisabled = !me.loopDisabled;
						me.loopIndicator.current = [me.loopDisabled];
						me.menuManager.notification.notify("Loop " + (me.loopDisabled ? "Off" : "On"), 15, 40, 15, true);
					}
				} else {
					// disable depth in multi-state mode
					if (!me.multiStateView) {
						if (!me.depthItem.locked) {
							if (me.depthItem.current[0] <= 0.99) {
								me.depthItem.current = me.viewDepthRange([me.depthItem.current[0] + 0.01, me.depthItem.current[1]], true, me);
							} else {
								me.depthItem.current = me.viewDepthRange([1, me.depthItem.current[1]], true, me);
							}
						}
					}
				}
				break;

			// l for decrease depth or cycle paste location
			case 76:
				// check for shift
				if (event.shiftKey) {
					me.cyclePasteLocation(me);
				} else {
					// disable depth in multi-state mode
					if (!me.multiStateView) {
						if (!me.depthItem.locked) {
							if (me.depthItem.current[0] >= 0.01) {
								me.depthItem.current = me.viewDepthRange([me.depthItem.current[0] - 0.01, me.depthItem.current[1]], true, me);
							} else {
								me.depthItem.current = me.viewDepthRange([0, me.depthItem.current[1]], true, me);
							}
						}
					}
				}
				break;

			// q for increase layers
			case 81:
				// check for ctrl
				if (event.ctrlKey) {
					me.qualityToggle.current = me.viewQualityToggle([!me.engine.pretty], true, me);
					me.menuManager.notification.notify((me.engine.pretty ? "High" : "Standard") + " Quality Rendering", 15, 80, 15, true);
				} else {
					// disable layers in multi-state mode
					if (!me.multiStateView) {
						if (!me.layersItem.locked) {
							if (me.layersItem.current[0] < ViewConstants.maxLayers) {
								me.layersItem.current = me.viewLayersRange([me.engine.layers + 1, me.layersItem.current[1]], true, me);
							}
						}
					}
				}
				break;

			// a for decrease layers
			case 65:
				if (event.shiftKey) {
					if (me.isSelection) {
						me.autoShrinkSelection(me);
					}
				} else {
					// check for ctrl key
					if (event.ctrlKey) {
						me.selectAllPressed(me);
					} else {
						// disable layers in multi-state mode
						if (!me.multiStateView) {
							if (!me.layersItem.locked) {
								if (me.layersItem.current[0] > ViewConstants.minLayers) {
									me.layersItem.current = me.viewLayersRange([me.engine.layers - 1, me.layersItem.current[1]], true, me);
								}
							}
						}
					}
				}
				break;

			// r for reset
			case 82:
				// check for shift key
				if (event.shiftKey) {
					Controller.resetAllViewers();
				} else {
					// reset this viewer
					me.playList.current = me.viewPlayList(ViewConstants.modeReset, true, me);
				}
				break;

			// s for toggle starfield, shift s for toggle state1 autofit, control-s for save
			case 83:
				// check for ctrl key
				if (event.ctrlKey) {
					// save current pattern to source document node
					me.saveCurrentRLE(me);
					me.menuManager.notification.notify("Saved", 15, 120, 15, true);
				} else {
					// check for shift key
					if (event.shiftKey) {
						// only enabled for [R]History
						if (me.engine.isLifeHistory) {
							// toggle state 1 fit mode
							me.state1Fit = !me.state1Fit;
							me.menuManager.notification.notify("AutoFit State 1 Mode " + (me.state1Fit ? "On" : "Off"), 15, 40, 15, true);
						}
					} else {
						// toggle stars
						me.starsButton.current = me.viewStarsToggle([!me.starsOn], true, me);
						me.menuManager.notification.notify("Stars " + (me.starsOn ? "On" : "Off"), 15, 40, 15, true);
					}
				}
				break;

			// n for switch to thumbnail view
			case 78:
				// check if thumbnail mode available
				if (me.thumbnailEverOn) {
					// check if thumbnail mode already on
					if (me.thumbnail) {
						// switch it off
						me.switchOffThumbnail();
					} else {
						// switch it on
						me.switchOnThumbnail();

						// close help if open
						if (me.displayHelp) {
							me.displayHelp = 0;
						}
					}
				}
				break;

			// v for reset view
			case 86:
				if (event.ctrlKey) {
					me.processPaste(me, event.shiftKey);
				} else {
					// check for shift key
					if (event.shiftKey) {
						// save current camera position
						me.saveCamera(me);
						me.menuManager.notification.notify("Saved camera position", 15, 100, 15, true);
					} else {
						// check if controls are disabled
						if (!me.controlsLocked) {
							// reset camera
							me.resetSavedCamera(me);
							me.menuManager.notification.notify("Restored camera position", 15, 100, 15, true);
	
							// flag manual change made if paused
							if (!me.generationOn) {
								me.manualChange = true;
							}
						}
					}
				}
				break;

			// ] for zoom in
			case 221: 
				// check for controls locked
				if (!me.controlsLocked) {
					// check for shift key
					if (event.shiftKey) {
						// zoom in by a factor of 2
						me.adjustZoomPosition(me.zoomItem.current[0], Math.log((me.engine.zoom * me.engine.originZ) * 2 / ViewConstants.minZoom) / Math.log(ViewConstants.maxZoom / ViewConstants.minZoom) - me.zoomItem.current[0]);
					} else {
						// zoom in slowly
						me.adjustZoomPosition(me.zoomItem.current[0], 0.01);
					}
				}
				break;

			// [ for zoom out
			case 219: 
				// check for controls locked
				if (!me.controlsLocked) {
					// check for shift key
					if (event.shiftKey) {
						// zoom out by a factor of 2
						me.adjustZoomPosition(me.zoomItem.current[0], Math.log((me.engine.zoom * me.engine.originZ) / 2 / ViewConstants.minZoom) / Math.log(ViewConstants.maxZoom / ViewConstants.minZoom) - me.zoomItem.current[0]);
					} else {
						// zoom out slowly
						me.adjustZoomPosition(me.zoomItem.current[0], -0.01);
					}
				}
				break;

			// 5 for reset angle
			case 53:
			case 101: // num 5
				if (event.ctrlKey) {
					if (event.shiftKey) {
						// random fill 2 state
						if (!me.engine.isPCA) {
							me.randomFill(me, true);
						}
					} else {
						me.switchToState(5);
					}
				} else {
					if (event.shiftKey) {
						// random fill
						me.randomFill(me, false);
					} else {
						// zero angle
						if (!me.angleItem.locked) {
							me.engine.angle = 0;
							me.angleItem.current = [me.engine.angle, me.engine.angle];
						}
					}
				}
				break;

			// 1 for 100% zoom
			case 49:
			case 97: // num 1
				if (event.ctrlKey) {
					me.switchToState(1);
				} else {
					// check for shift
					if (event.shiftKey) {
						// set zoom to nearest integer
						me.changeZoom(me, me.engine.zoom * me.engine.originZ, true);
	
						// display notification
						me.menuManager.notification.notify("Integer Zoom", 15, 40, 15, true);
					} else {
						// change zoom to 100%
						me.changeZoom(me, 1, false);
					}
				}
				break;

			// 2 for 200% zoom
			case 50:
			case 98: // num 2
				if (event.ctrlKey) {
					me.switchToState(2);
				} else {
					// check for shift
					if (event.shiftKey) {
						// zoom to -2x
						me.changeZoom(me, 0.5, false);
					} else {
						// zoom to 200%
						me.changeZoom(me, 2, false);
					}
				}
				break;

			// 3 for 3200% zoom
			case 51:
			case 99: // num 3
				if (event.ctrlKey) {
					me.switchToState(3);
				} else {
					// check for shift
					if (event.shiftKey) {
						// zoom to 6400%
						me.changeZoom(me, 64, false);
					} else {
						// zoom to 3200%
						me.changeZoom(me, 32, false);
					}
				}
				break;

			// 4 for 400% zoom
			case 52:
			case 100: // num 4
				if (event.ctrlKey) {
					me.switchToState(4);
				} else {
					// check for shift
					if (event.shiftKey) {
						// zoom to -4x
						me.changeZoom(me, 0.25, false);
					} else {
						// zoom to 400%
						me.changeZoom(me, 4, false);
					}
				}
				break;

			// 6 for 1600% zoom
			case 54:
			case 102: // num 6
				if (event.ctrlKey) {
					me.switchToState(6);
				} else {
					// check for shift
					if (event.shiftKey) {
						// zoom to -16x
						me.changeZoom(me, 0.0625, false);
					} else {
						// zoom to 1600%
						me.changeZoom(me, 16, false);
					}
				}
				break;

			// 7 for decrease graph opacity
			case 55:
				if (event.ctrlKey) {
					me.switchToState(7);
				} else {
					// check if graph disabled
					if (me.graphDisabled) {
						me.menuManager.notification.notify("Graph Disabled", 15, 40, 15, true);
					} else {
						if (me.popGraphOpacity > 0) {
							me.popGraphOpacity -= 0.05;
							if (me.popGraphOpacity < 0) {
								me.popGraphOpacity = 0;
							}
						}
						me.opacityItem.current = me.viewOpacityRange([me.popGraphOpacity, me.popGraphOpacity], false, me);
					}
				}
				break;

			// 8 for 800% zoom
			case 56:
			case 104: // num 8
				if (event.ctrlKey) {
					me.switchToState(8);
				} else {
					// check for shift
					if (event.shiftKey) {
						// zoom to -8x
						me.changeZoom(me, 0.125, false);
					} else {
						// zoom to 800%
						me.changeZoom(me, 8, false);
					}
				}
				break;

			// 9 for increase graph opacity
			case 57:
				if (event.ctrlKey) {
					me.switchToState(9);
				} else {
					// check if graph disabled
					if (me.graphDisabled) {
						me.menuManager.notification.notify("Graph Disabled", 15, 40, 15, true);
					} else {
						if (me.popGraphOpacity < 1) {
							me.popGraphOpacity += 0.05;
							if (me.popGraphOpacity > 1) {
								me.popGraphOpacity = 1;
							}
						}
						me.opacityItem.current = me.viewOpacityRange([me.popGraphOpacity, me.popGraphOpacity], false, me);
					}
				}
				break;

			// 0 for reset speed
			case 48:
			case 96: // num 0
				if (event.ctrlKey) {
					me.switchToState(0);
				} else {
					// reset gps
					me.gensPerStep = 1;
					me.stepRange.current = me.viewStepRange([me.gensPerStep, me.gensPerStep], true, me);
	
					// reset 
					me.generationRange.current = me.viewGenerationRange([1, me.generationRange.current[1]], true, me);
				}
				break;

			// - for slower
			case 189:
			case 109: // num -
				// check for ctrl -
				if (event.ctrlKey && keyCode == 189) {
					// pass up to browser
					processed = false;
				} else {
					// do not change if view only mode
					if (!me.viewOnly) {
						// check for step
						if (me.gensPerStep > ViewConstants.minStepSpeed) {
							// check for shift
							if (event.shiftKey) {
								// go to minimum step
								me.gensPerStep = ViewConstants.minStepSpeed;
							} else {
								// decrease step
								me.gensPerStep -= 1;
							}
							me.stepRange.current = me.viewStepRange([me.gensPerStep, me.gensPerStep], true, me);
						} else {
							// decrease generation speed
							if (me.generationRange) {
								if (me.generationRange.current[0] >= 0.01 && !event.shiftKey) {
									me.generationRange.current = me.viewGenerationRange([me.generationRange.current[0] - 0.01, me.generationRange.current[1]], true, me);
								} else {
									me.generationRange.current = me.viewGenerationRange([0, me.generationRange.current[1]], true, me);
								}
							}
						}
					}
				}
				break;

			// = for faster
			case 187:
			case 107: // num +
				// check for ctrl +
				if (event.ctrlKey && keyCode == 187) {
					// pass up to browser
					processed = false;
				} else {
					// do not change if view only mode
					if (!me.viewOnly) {
						// increase generation speed
						if (me.generationRange) {
							if (me.generationRange.current[0] <= 0.99 && !event.shiftKey) {
								me.generationRange.current = me.viewGenerationRange([me.generationRange.current[0] + 0.01, me.generationRange.current[1]], true, me);
							} else {
								// check whether speed was maximum
								if (me.generationRange.current[0] <= 0.99) {
									// set maximum
									me.generationRange.current = me.viewGenerationRange([1, me.generationRange.current[1]], true, me);
								} else {
									// set maximum
									me.generationRange.current = me.viewGenerationRange([1, me.generationRange.current[1]], true, me);
									// increase step
									if (me.gensPerStep < ViewConstants.maxStepSpeed) {
										// check for shift
										if (event.shiftKey) {
											// go to maximum step
											me.gensPerStep = ViewConstants.maxStepSpeed;
										} else {
											// increase step
											me.gensPerStep += 1;
										}
										me.stepRange.current = me.viewStepRange([me.gensPerStep, me.gensPerStep], true, me);
									}
								}
							}
						}
					}
				}
				break;

			// , for rotate anticlockwise
			case 188:
				if (event.shiftKey && (me.isSelection || me.isPasting)) {
					me.rotateCCWPressed(me);
				} else {
					if (!me.angleItem.locked) {
						// get the current value
						value = me.angleItem.current[0];
	
						// check for shift key
						if (event.shiftKey) {
							// decrease by a quarter
							value -= 90;
						} else {
							// decrease by a degree
							value -= 1;
						}
	
						// wrap if required
						if (value < 0) {
							value += 360;
						}

						// update UI
						me.angleItem.current = me.viewAngleRange([value, value], true, me);
					}
				}
				break;

			// . for rotate clockwise
			case 190:
				if (event.shiftKey && (me.isSelection || me.isPasting)) {
					me.rotateCWPressed(me);
				} else {
					if (!me.angleItem.locked) {
						// get the current value
						value = me.angleItem.current[0];
	
						// check for shift key
						if (event.shiftKey) {
							// increase by a quarter
							value += 90;
						} else {
							// increase by a degree
							value += 1;
						}
	
						// wrap if required
						if (value >= 360) {
							value -= 360;
						}
	
						// update UI
						me.angleItem.current = me.viewAngleRange([value, value], true, me);
					}
				}
				break;

			// Del to clear cells or selection
			case 46:
				if (me.isSelection) {
					if (event.shiftKey) {
						me.clearOutside(me);
					} else {
						me.doClearSelection(me, event.ctrlKey);
					}
				} else {
					if (event.ctrlKey) {
						value = me.clearCells(me, event.ctrlKey, false);
						if (value) {
							me.menuManager.notification.notify("Cleared [R]History cells", 15, 120, 15, true);
						}
					}
				}
				break;

			// j for jump to POI
			case 74:
				// check for ctrl and shift
				if (event.ctrlKey && event.shiftKey) {
					// pass up to browser
					processed = false;
				} else {
					// check for defined POIs
					if (me.waypointManager.numPOIs()) {
						// check for controls locked
						if (!me.controlsLocked) {
							// check for shift key
							if (event.shiftKey) {
								// go to previous POI
								me.prevPOIPressed(me);
							} else {
								// go to next POI
								me.nextPOIPressed(me);
							}
						}
					} else {
						me.menuManager.notification.notify("No POIs defined", 15, 80, 15, true);
					}
				}
				break;

			// t for timing display
			case 84:
				// check for shift key
				if (event.shiftKey) {
					// toggle extended timing
					me.menuManager.showExtendedTiming = !me.menuManager.showExtendedTiming;
				} else {
					// toggle fps
					me.fpsButton.current = me.viewFpsToggle([!me.menuManager.showTiming], true, me);
				}
				break;
				
			// u for UI or reverse playback for Margolus
			case 85:
				if (event.shiftKey) {
					// ignore if NOGUI defined
					if (!me.noGUIDefined) {
						me.noGUI = !me.noGUI;
						me.viewMenu.deleted = me.noGUI;
						me.menuManager.noGUI = me.noGUI;
						// close help if open
						if (me.noGUI) {
							me.displayHelp = 0;
							me.displayErrors = 0;
						}
					}
				} else {
					// check for Margolus
					if (me.engine.isMargolus || me.engine.isPCA) {
						// check rule is reversible
						if (me.engine.margolusReverseLookup1) {
							me.directionPressed(me);
						}
					}
				}
				break;

			// g for generation statistics
			case 71:
				if (event.ctrlKey) {
					// toggle autogrid mode
					me.autoGrid = !me.autoGrid;
					me.autoGridButton.current = me.viewAutoGridToggle([me.autoGrid], true, me);
					me.menuManager.notification.notify("Auto Grid Lines " + (me.autoGrid ? "On" : "Off"), 15, 40, 15, true);
				} else {
					// do not display if view only mode
					if (!me.viewOnly) {
						// check for shift
						if (event.shiftKey) {
							// toggle relative mode if defined
							if (me.genDefined) {
								me.relativeToggle.current = me.viewRelativeToggle([!me.genRelative], true, me);
								me.menuManager.notification.notify("Generation display " + (me.genRelative ? "Relative" : "Absolute"), 15, 40, 15, true);
							}
						} else {
							// toggle statistics
							me.viewStats([!me.statsOn], true, me);
							if (me.genToggle) {
								me.genToggle.current = [me.statsOn];
								me.menuManager.toggleRequired = true;
							}
						}
					}
				}
				break;

			// f for fit zoom
			case 70:
				// check for ctrl key
				if (event.ctrlKey) {
					if (me.isSelection) {
						me.fitZoomDisplay(true, true, ViewConstants.fitZoomSelection);
						me.menuManager.notification.notify("Fit Selection", 15, 80, 15, true);
					}
				} else {
					// check for shift key
					if (event.shiftKey) {
						if (!me.autoFitToggle.locked) {
							me.autoFit = !me.autoFit;
							me.autoFitToggle.current = me.toggleAutoFit([me.autoFit], true, me);
							me.menuManager.notification.notify("AutoFit " + (me.autoFit ? "On" : "Off"), 15, 40, 15, true);
						}
					} else {
						// fit zoom
						if (!me.fitButton.locked) {
							me.fitZoomDisplay(true, true, ViewConstants.fitZoomPattern);
							me.menuManager.notification.notify("Fit Pattern", 15, 80, 15, true);
	
							// flag manual change made if paused
							if (!me.generationOn) {
								me.manualChange = true;
							}
						}
					}
				}
				break;

			// o for new screenshot
			case 79:
				// check for ctrl key
				if (event.ctrlKey) {
					if (event.shiftKey) {
						// attempt to read RLE from clipboard
						/*jshint -W119 */
						navigator.clipboard.readText().then(text => me.loadText(me, text));
					} else {
						me.loadPattern(me);
					}
				} else {
					// check for shift key
					if (event.shiftKey) {
						// capture graph
						me.screenShotScheduled = 2;
					} else {
						// capture life
						me.screenShotScheduled = 1;
					}
				}
				break;

			// arrow left for left
			case 37:
				// check for shift key
				if (event.shiftKey) {
					// scroll pattern diagonally
					me.moveView(me.engine.zoom, me.engine.zoom);
				} else {
					// scroll pattern right
					me.moveView(me.engine.zoom, 0);
				}
				break;

			// arrow up for up
			case 38:
				// check if help displayed
				if (me.displayHelp) {
					// scroll help up
					me.scrollHelpUp(me, 1);
				} else {
					// check if errors displayed
					if (me.displayErrors) {
						// scroll error list up
						me.scrollErrorsUp(me, 1);
					} else {
						// check for shift key
						if (event.shiftKey) {
							// scroll pattern diagonally
							me.moveView(-me.engine.zoom, me.engine.zoom);
						} else {
							// scroll pattern down
							me.moveView(0, me.engine.zoom);
						}
					}
				}
				break;

			// arrow right for right
			case 39:
				// check for shift key
				if (event.shiftKey) {
					// scroll pattern diagonally
					me.moveView(-me.engine.zoom, -me.engine.zoom);
				} else {
					// scroll pattern left
					me.moveView(-me.engine.zoom, 0);
				}
				break;

			// arrow down for down
			case 40:
				// check if help displayed
				if (me.displayHelp) {
					// scroll help down
					me.scrollHelpDown(me, 1);
				} else {
					// check if errors displayed
					if (me.displayErrors) {
						// scroll error list down
						me.scrollErrorsDown(me, 1);
					} else {
						// check for shift key
						if (event.shiftKey) {
							me.moveView(me.engine.zoom, -me.engine.zoom);
						} else {
							// scroll pattern up
							me.moveView(0, -me.engine.zoom);
						}
					}
				}
				break;

			// m for menu or cycle paste mode
			case 77:
				if (event.ctrlKey) {
					me.fitZoomDisplay(true, true, ViewConstants.fitZoomMiddle);
					me.menuManager.notification.notify("Center Pattern", 15, 80, 15, true);
				} else {
					if (event.shiftKey) {
						me.cyclePasteMode(me);
					} else {
						if (me.navToggle && !me.navToggle.deleted) {
							// if menu open then close any settings sections
							if (me.navToggle.current[0]) {
								// clear settings section
								me.showDisplaySettings = false;
								me.showInfoSettings = false;
								me.showPatternSettings = false;
								me.showPlaybackSettings = false;
								me.showThemeSelection = false;
							}

							// toggle navigation menu
							me.navToggle.current[0] = !me.navToggle.current[0];
		
							// mark toggle required
							me.menuManager.toggleRequired = true;
						}
					}
				}
				break;

			// c for theme cycle or copy
			case 67:
				// check for control-C
				if (event.ctrlKey) {
					me.processCopy(me, event.shiftKey, event.altKey);
				} else {
					// disable colour themes in multi-state mode
					if (!me.multiStateView) {
						if (me.themeButton && !me.themeButton.locked) {
							// check for shift key
							if (event.shiftKey) {
								// decrement colour theme
								value = me.engine.colourTheme - 1;
								if (value < 0) {
									// check for custom theme
									if (me.customTheme) {
										value = me.engine.numThemes;
									} else {
										value = me.engine.numThemes - 1;
									}
								}
							} else {
								// increment colour theme
								value = me.engine.colourTheme + 1;

								// check for custom theme
								if (me.customTheme) {
									// allow custom theme
									if (value >= me.engine.numThemes + 1) {
										value = 0;
									}
								} else {
									// no custom theme
									if (value >= me.engine.numThemes) {
										value = 0;
									}
								}
							}

							// set the new theme
							me.setNewTheme(value, me.engine.colourChangeSteps, me);
							if (!me.engine.isNone && !me.showThemeSelection) {
								me.menuManager.notification.notify(me.themeName(me.engine.colourTheme) + " Theme", 15, 40, 15, true);
							}
						}
					}
				}
				break;

			// h for display help
			case 72:
				// check for shift key
				if (event.shiftKey) {
					// toggle history fit mode
					me.historyFitButton.current = me.viewHistoryFitToggle([!me.historyFit], true, me);
					me.menuManager.notification.notify("AutoFit History Mode " + (me.historyFit ? "On" : "Off"), 15, 40, 15, true);
				} else {
					// if errors then set script help page
					if (me.scriptErrors.length) {
						// toggle help page
						if (me.displayHelp) {
							me.displayHelp = 0;
						} else {
							// open help
							me.displayHelp = 1;
						}
					} else {
						// toggle help
						if (me.displayHelp) {
							me.displayHelp = 0;
						} else {
							// do not display help if in thumbnail mode
							if (!me.thumbnail) {
								// open help
								me.displayHelp = 1;
							}
						}
					}

					// update the help UI
					me.helpToggle.current = me.toggleHelp([me.displayHelp], true, me);
					me.menuManager.toggleRequired = true;
				}

				break;

			// i for display information
			case 73:
				// check for ctrl and shift
				if (event.ctrlKey && event.shiftKey) {
					// pass up to browser
					processed = false;
				} else {
					// check for ctrl key
					if (event.ctrlKey) {
						me.invertSelectionPressed(me);
					} else {
						// check for shift key
						if (event.shiftKey) {
							// toggle infobar
							me.infoBarButton.current = me.viewInfoBarToggle([!me.infoBarEnabled], true, me);
						} else {
							// check if help displayed
							if (me.displayHelp) {
								// check if on the info topic
								if (me.helpTopic === ViewConstants.informationTopic) {
									// close help
									me.displayHelp = 0;
								} else {
									// switch to the information topic
									me.setHelpTopic(ViewConstants.informationTopic, me);
								}
							} else {
								// do not display information if in thumbnail mode
								if (!me.thumbnail) {
									me.setHelpTopic(ViewConstants.informationTopic, me);
								}
							}
		
							// update the help UI
							me.helpToggle.current = me.toggleHelp([me.displayHelp], true, me);
							me.menuManager.toggleRequired = true;
						}
					}
				}

				break;

			// Esc to close help and clear error messages or pause playback
			case 27:
				// check for popup Viewer
				if (me.isInPopup) {
					// check if errors are displayed
					if (me.scriptErrors.length) {
						// clear errors
						me.scriptErrors = [];
						me.displayErrors = 0;
					} else {
						// check if pasting
						if (me.isPasting || me.evolvingPaste) {
							me.cancelPaste(me);
						} else {
							// check for pick mode
							if (me.pickMode) {
								me.pickToggle.current = me.togglePick([false], true, me);
							} else {
								// check for Identify reuslts
								if (me.resultsDisplayed) {
									me.identifyClosePressed(me);
								} else {
									// close the popup Viewer
									hideViewer();
								}
							}
						}
					}
				} else {
					// check if help displayed
					if (me.displayHelp) {
						// close help
						me.displayHelp = 0;
					} else {
						// check if errors displayed
						if (me.scriptErrors.length) {
							// clear errors
							me.scriptErrors = [];
							me.displayErrors = 0;
						} else {
							// check if pasting
							if (me.isPasting || me.evolvingPaste) {
								me.cancelPaste(me);
							} else {
								if (me.pickMode) {
									me.pickToggle.current = me.togglePick([false], true, me);
								} else {
									// check for Identify results
									if (me.resultsDisplayed) {
										me.identifyClosePressed(me);
									} else {
										// check if playing
										if (me.generationOn) {
											// switch to pause
											me.playList.current = me.viewPlayList(ViewConstants.modePause, true, me);
										}
									}
								}
							}
						}
					}
				}

				// update the help UI
				me.helpToggle.current = me.toggleHelp([me.displayHelp], true, me);
				me.menuManager.toggleRequired = true;

				break;

			// Page Up
			case 33:
				// check if help displayed
				if (me.displayHelp) {
					// check for shift key
					if (event.shiftKey) {
						// move to previous section
						me.previousHelpSection(me);
					} else {
						// move to previous page
						me.scrollHelpUp(me, me.numHelpPerPage);
					}
				} else {
					// check if errors displayed
					if (me.displayErrors) {
						// move to previous page
						me.scrollErrorsUp(me, me.numHelpPerPage);
					} else {
						// check for multiverse mode
						if (DocConfig.multi) {
							me.universe -= 1;
							if (me.universe < 0) {
								me.universe = Controller.patterns.length - 1;
							}
							me.startViewer(Controller.patterns[me.universe].pattern, false);
						}
					}
				}
				break;

			// Page Down
			case 34:
				// check if help displayed
				if (me.displayHelp) {
					// check for shift
					if (event.shiftKey) {
						// move to next help section
						me.nextHelpSection(me);
					} else {
						// move to next page
						me.scrollHelpDown(me, me.numHelpPerPage);
					}
				} else {
					// check if errors displayed
					if (me.displayErrors) {
						// move to next page
						me.scrollErrorsDown(me, me.numHelpPerPage);
					} else {
						// check for multiverse mode
						if (DocConfig.multi) {
							me.universe += 1;
							if (me.universe >= Controller.patterns.length) {
								me.universe = 0;
							}
							me.startViewer(Controller.patterns[me.universe].pattern, false);
						}
					}
				}
				break;

			// Home
			case 36:
				// check if help displayed
				if (me.displayHelp) {
					// move to top
					me.displayHelp = 1;
				} else {
					// check if errors displayed
					if (me.displayErrors) {
						// move to top
						me.displayErrors = 1;
					} else {
						// check if multiverse mode is on
						if (DocConfig.multi) {
							me.universe = 0;
							me.startViewer(Controller.patterns[me.universe].pattern, false);
						}
					}
				}
				break;

			// End
			case 35:
				// check if help displayed
				if (me.displayHelp) {
					// move to bottom
					me.displayHelp = me.numHelpLines - me.numHelpPerPage;
				} else {
					// check if errors displayed
					if (me.displayErrors) {
						// move to bottom
						me.displayErrors = me.scriptErrors.length - me.numHelpPerPage;
					} else {
						// check if multiverse mode is on
						if (DocConfig.multi) {
							me.universe = Controller.patterns.length - 1;
							me.startViewer(Controller.patterns[me.universe].pattern, false);
						}
					}
				}
				break;

			// f1 for toggle edit mode
			case 112:
				if (!me.viewOnly) {
					me.drawing = !me.drawing;
					me.modeList.current = me.viewModeList((me.drawing ? ViewConstants.modeDraw : ViewConstants.modePan), true, me);
					me.menuManager.notification.notify((me.drawing ? "Draw" : "Pan") + " Mode", 15, 40, 15, true);
				}
				break;

			// f2 for draw mode
			case 113:
				// check for shift key
				if (event.shiftKey) {
					me.smartToggle.current = me.toggleSmart([!me.smartDrawing], true, me);
					me.menuManager.notification.notify("Smart Drawing " + (me.smartDrawing ? "On" : "Off"), 15, 40, 15, true);
				} else {
					me.modeList.current = me.viewModeList(ViewConstants.modeDraw, true, me);
				}
				break;

			// f3 for pick mode
			case 114:
				if (!me.viewOnly) {
					me.modeList.current = me.viewModeList(ViewConstants.modeDraw, true, me);
					if (!me.pickMode) {
						me.pickToggle.current = me.togglePick([true], true, me);
					}
				}
				break;

			// f4 for select mode
			case 115:
				if (!me.modeList.itemLocked[ViewConstants.modeSelect]) {
					me.modeList.current = me.viewModeList(ViewConstants.modeSelect, true, me);
				}
				break;

			// f5 for pan mode
			case 116:
				me.modeList.current = me.viewModeList(ViewConstants.modePan, true, me);
				break;

			// f6 to toggle oscillator search
			case 117:
				if (!me.identifyButton.locked) {
					if (event.ctrlKey) {
						me.identifyFast = true;
					}
					me.identifyPressed(me);
				}
				break;

			// ignore f11 so browser processes it (toggle fullscreen)
			case 122:
				processed = false;
				break;

			// ignore other keys
			default:
				// flag key not handled if specified or f5 (browser refresh) if not implemented above
				if (keyCode === -1 || keyCode === 116) {
					processed = false;
				}
				break;
			}
		}

		// return whether key processed
		return processed;
	};

	/*jshint -W069 */
	window["KeyProcessor"] = KeyProcessor;
}
());


@echo off
@rem Closure Compiler for LifeViewer

@rem concatenate all source files enclosed by start.js and end.js which create a single scope
copy /b start.js+..\js\compatibility.js+..\js\allocator.js+..\js\alias.js+..\js\canvasmenu.js+..\js\patterns.js+..\js\colours.js+..\js\box.js+..\js\snapshot.js+..\js\hrot.js+..\js\life.js+..\js\script.js+..\js\waypoint.js+..\js\window.js+..\js\random.js+..\js\stars.js+..\js\parser.js+..\js\lifeview.js+..\js\help.js+..\js\keywords.js+..\js\keys.js+end.js all.js

@rem run the closure compiler
"C:\Program Files\Java\jre1.8.0_341\bin\java.exe" -jar compiler.jar -W VERBOSE --jscomp_off=checkVars --compilation_level ADVANCED_OPTIMIZATIONS --js=all.js --js_output_file=lv-plugin.js
 

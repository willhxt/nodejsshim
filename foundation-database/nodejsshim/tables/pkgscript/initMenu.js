/* This file is part of the Node.js shims extension package for xTuple ERP, and is
 * Copyright (c) 1999-2018 by OpenMFG LLC, d/b/a xTuple.
 * It is licensed to you under the Common Public Attribution License
 * version 1.0, the full text of which (including xTuple-specific Exhibits)
 * is available at www.xtuple.com/CPAL.  By using this software, you agree
 * to be bound by its terms.
 */

function sNodeJsConsole() {
  try {
    var _nodeJsConsole = toolbox.openWindow("nodeJsConsole", 0, Qt.Modal, Qt.Window);

  } catch (e) {
    print("initMenu::sNodeJsConsole() exception @ " + e.lineNumber + ": " + e);
  }
}

/*
 * Add a debugging menu option under `System > Design` that opens the
 * `nodeJsConsole` script and screen.
 */
try {
  if (privileges.value("MaintainScripts")) {
    var menuDesign = mainwindow.findChild("menu.sys.design");
    menuDesign.addSeparator();

    var menuNodeJs = new QMenu(qsTranslate("menuDesign", "Node.js Shim"), mainwindow);
    menuNodeJs.objectName = "menu.sys.design.nodejs";
    menuDesign.addMenu(menuNodeJs);

    var nodeJsConsoleAction = menuNodeJs.addAction(qsTranslate("menuNodeJs", "Examples..."));
    nodeJsConsoleAction.objectName = "nodejs.nodeJsConsole";
    nodeJsConsoleAction.triggered.connect(sNodeJsConsole);
  }
} catch (e) {
  print("initMenu::nodejsshim exception @ " + e.lineNumber + ": " + e);
}

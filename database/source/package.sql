SELECT createpkgschema('nodejsshim',
                       $PKG$This package creates the required database tables and functions for xTuple Node.js shims.
This schema is part of the Node.js shims for the Qt Script Engine Package for xTuple ERP, and is Copyright (c) 1999-2016 by OpenMFG LLC, d/b/a xTuple.  It is licensed to you under the xTuple End-User License Agreement ("the EULA"), the full text of which is available at www.xtuple.com/EULA.  While the EULA gives you access to source code and encourages your involvement in the development process, this Package is not free software.  By using this software, you agree to be bound by the terms of the EULA.$PKG$);
update pkghead set pkghead_descrip = 'xTuple ERP Node.js shims',
                   pkghead_version = '1.0.0-rc',
                   pkghead_developer = 'xTuple'
 where pkghead_name = 'nodejsshim';

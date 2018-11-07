SELECT createpkgschema('nodejsshim',
                       $PKG$This package creates the required database tables and functions for xTuple Node.js shims.
This schema is part of the Node.js shims for the Qt Script Engine Package for xTuple ERP, and is Copyright (c) 1999-2018 by OpenMFG LLC, d/b/a xTuple.  It is licensed to you under the Common Public Attribution License version 1.0, the full text of which (including xTuple-specific Exhibits) is available at www.xtuple.com/CPAL.  By using this software, you agree to be bound by its terms.$PKG$);

-- Can remove INSERT in 4.11.
INSERT INTO pkghead (
  pkghead_name,
  pkghead_descrip,
  pkghead_version,
  pkghead_developer
)
SELECT
  'nodejsshim',
  'xTuple ERP Node.js shims',
  '1.0.2',
  'xTuple'
WHERE NOT EXISTS (SELECT 1 FROM pkghead WHERE pkghead_name = 'nodejsshim');

UPDATE pkghead SET pkghead_descrip = 'xTuple ERP Node.js shims',
                   pkghead_version = '1.0.2',
                   pkghead_developer = 'xTuple'
 WHERE pkghead_name = 'nodejsshim';

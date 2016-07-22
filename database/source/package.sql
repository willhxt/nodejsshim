DO $$

  var insertSql = "INSERT INTO pkghead (\n" +
                  "  pkghead_name,\n" +
                  "  pkghead_descrip,\n" +
                  "  pkghead_version,\n" +
                  "  pkghead_developer,\n" +
                  "  pkghead_notes\n" +
                  ") VALUES (\n" +
                  "  $1,\n" +
                  "  $2,\n" +
                  "  $3,\n" +
                  "  $4,\n" +
                  "  $5\n" +
                  ");";
  var selectSql = "SELECT pkghead_id FROM pkghead WHERE (pkghead_name='nodejsshim');";
  var updateSql = "UPDATE pkghead SET\n" +
                  "  pkghead_descrip = $1,\n" +
                  "  pkghead_version = $2,\n" +
                  "  pkghead_developer = $3,\n" +
                  "  pkghead_notes = $4\n" +
                  "WHERE pkghead_name='nodejsshim';";

  var select = plv8.execute(selectSql);

  if (select.length && select.length === 1) {
    plv8.execute(updateSql, [
      "xTuple ERP Node.js shims for the Qt Script Engine.",
      "1.0.0-beta",
      "xTuple",
      "This package creates the required database tables and functions for xTuple ERP Node.js shims for the Qt Script Engine."
    ]);
  } else if (select.length === 0) {
    plv8.execute(insertSql, [
      "nodejsshim",
      "xTuple ERP Node.js shims for the Qt Script Engine.",
      "1.0.0-beta",
      "xTuple",
      "This package creates the required database tables and functions for xTuple ERP Node.js shims for the Qt Script Engine."
    ]);
  } else {
    plv8.elog(ERROR, "Error creating or updating nodejsshim record in the pkghead table.");
  }

$$ language plv8;

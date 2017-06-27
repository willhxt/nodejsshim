DROP FUNCTION IF EXISTS nodejsshim.npm_install(text, text, text, text, text);

CREATE OR REPLACE FUNCTION nodejsshim.npm_install(schema_name text,
                                                  package_name text,
                                                  version text,
                                                  url text,
                                                  code text)
  RETURNS boolean AS
$BODY$
/**
 * Adds or updates javascript code in the `schema_name.node_modules` table.
 * The `nodejsshim.node_modules` table is the base table. Other extension
 * packages inherit from that table. The Node.js shim's `require` function
 * queries the `nodejsshim.node_modules` table to load the javascript code.
 *
 * @param {String} schema_name - The schema to to INSERT or UPDATE to.
 * @param {String} package_name - The name of the package to be used by `require('package-name-here')`.
 * @param {String} version - The version of the package.
 * @param {String} url - The URL where the package is published.
 * @param {String} code - The Browserify bundled package code.
 * @return {Boolean} - True on sucess.
 */
DECLARE
  _count integer;
  insertQuery text;
  selectQuery text;
  updateQuery text;

BEGIN
  if (schema_name IS NULL) THEN
    schema_name = 'nodejsshim';
  END IF;
  if (version IS NULL) THEN
    version = '0.0.0';
  END IF;

  SELECT count(*) INTO _count
  FROM nodejsshim.node_modules
  WHERE node_modules_package_name = package_name;

  IF (_count = 0) THEN
    insertQuery = 'INSERT INTO %I.node_modules (' ||
                  '  node_modules_package_name, ' ||
                  '  node_modules_version, ' ||
                  '  node_modules_url, ' ||
                  '  node_modules_code' ||
                  ') VALUES (' ||
                  '  %L, ' ||
                  '  %L, ' ||
                  '  %L, ' ||
                  '  %L ' ||
                  ');';
    EXECUTE format(insertQuery, schema_name, package_name, version, url, code);
  ELSIF (_count < 2) THEN
    updateQuery = 'UPDATE %I.node_modules SET' ||
                  '  node_modules_version = %L, ' ||
                  '  node_modules_url = %L, ' ||
                  '  node_modules_code = %L ' ||
                  'WHERE node_modules_package_name = %L;';
    EXECUTE format(updateQuery, schema_name, version, url, code, package_name);
  ELSE
    RAISE EXCEPTION 'More than one version of % has been installed. This is not allowed.', package_name;
  END IF;

  RETURN true;
END;
$BODY$
LANGUAGE plpgsql VOLATILE;

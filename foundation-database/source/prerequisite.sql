DO $$
BEGIN
  IF (compareVersion(fetchMetricText('ServerVersion'), '4.10.0Beta2') < 0) THEN
    RAISE EXCEPTION 'Cannot install Node.js shims for the Qt Script Engine. This version of xTuple Node.js shims for the Qt Script Engine requires xTuple ERP 4.10.0Beta2 or later.';
  END IF;
END
$$ language plpgsql;

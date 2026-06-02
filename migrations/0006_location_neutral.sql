DELETE FROM cache
WHERE (cache_key LIKE 'weather-%' OR cache_key LIKE 'marine-%' OR cache_key LIKE 'weather-v%' OR cache_key LIKE 'marine-v%')
  AND EXISTS (
    SELECT 1
    FROM settings AS location_name
    JOIN settings AS location_region ON location_region.key = 'locationRegion' AND location_region.value = 'Cornwall'
    JOIN settings AS latitude ON latitude.key = 'latitude' AND latitude.value = '50.4155'
    JOIN settings AS longitude ON longitude.key = 'longitude' AND longitude.value = '-5.0737'
    JOIN settings AS timezone ON timezone.key = 'timezone' AND timezone.value = 'Europe/London'
    WHERE location_name.key = 'locationName' AND location_name.value = 'Newquay'
  );

UPDATE settings
SET value = ''
WHERE key = 'locationName'
  AND value = 'Newquay'
  AND EXISTS (
    SELECT 1
    FROM settings AS location_name
    JOIN settings AS location_region ON location_region.key = 'locationRegion' AND location_region.value = 'Cornwall'
    JOIN settings AS latitude ON latitude.key = 'latitude' AND latitude.value = '50.4155'
    JOIN settings AS longitude ON longitude.key = 'longitude' AND longitude.value = '-5.0737'
    JOIN settings AS timezone ON timezone.key = 'timezone' AND timezone.value = 'Europe/London'
    WHERE location_name.key = 'locationName' AND location_name.value = 'Newquay'
  );

UPDATE settings
SET value = ''
WHERE key = 'locationRegion'
  AND value = 'Cornwall'
  AND EXISTS (
    SELECT 1
    FROM settings AS location_name
    JOIN settings AS location_region ON location_region.key = 'locationRegion' AND location_region.value = 'Cornwall'
    JOIN settings AS latitude ON latitude.key = 'latitude' AND latitude.value = '50.4155'
    JOIN settings AS longitude ON longitude.key = 'longitude' AND longitude.value = '-5.0737'
    JOIN settings AS timezone ON timezone.key = 'timezone' AND timezone.value = 'Europe/London'
    WHERE location_name.key = 'locationName' AND location_name.value = 'Newquay'
  );

UPDATE settings
SET value = ''
WHERE key = 'latitude'
  AND value = '50.4155'
  AND EXISTS (
    SELECT 1
    FROM settings AS location_name
    JOIN settings AS location_region ON location_region.key = 'locationRegion' AND location_region.value = 'Cornwall'
    JOIN settings AS latitude ON latitude.key = 'latitude' AND latitude.value = '50.4155'
    JOIN settings AS longitude ON longitude.key = 'longitude' AND longitude.value = '-5.0737'
    JOIN settings AS timezone ON timezone.key = 'timezone' AND timezone.value = 'Europe/London'
    WHERE location_name.key = 'locationName' AND location_name.value = 'Newquay'
  );

UPDATE settings
SET value = ''
WHERE key = 'longitude'
  AND value = '-5.0737'
  AND EXISTS (
    SELECT 1
    FROM settings AS location_name
    JOIN settings AS location_region ON location_region.key = 'locationRegion' AND location_region.value = 'Cornwall'
    JOIN settings AS latitude ON latitude.key = 'latitude' AND latitude.value = '50.4155'
    JOIN settings AS longitude ON longitude.key = 'longitude' AND longitude.value = '-5.0737'
    JOIN settings AS timezone ON timezone.key = 'timezone' AND timezone.value = 'Europe/London'
    WHERE location_name.key = 'locationName' AND location_name.value = 'Newquay'
  );

UPDATE settings
SET value = ''
WHERE key = 'timezone'
  AND value = 'Europe/London'
  AND EXISTS (
    SELECT 1
    FROM settings AS location_name
    JOIN settings AS location_region ON location_region.key = 'locationRegion' AND location_region.value = 'Cornwall'
    JOIN settings AS latitude ON latitude.key = 'latitude' AND latitude.value = '50.4155'
    JOIN settings AS longitude ON longitude.key = 'longitude' AND longitude.value = '-5.0737'
    JOIN settings AS timezone ON timezone.key = 'timezone' AND timezone.value = 'Europe/London'
    WHERE location_name.key = 'locationName' AND location_name.value = 'Newquay'
  );

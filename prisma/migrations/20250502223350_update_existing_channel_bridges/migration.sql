-- Update existing channel bridges with server information

-- Testing channels (StarbunkCrusaders <-> StarbunkStaging <-> CovaDaxServer)
UPDATE "ChannelBridge" 
SET "sourceServer" = 'StarbunkCrusaders', "targetServer" = 'StarbunkStaging'
WHERE "sourceChannelId" = '757866614787014660' AND "targetChannelId" = '856617421942030364';

UPDATE "ChannelBridge" 
SET "sourceServer" = 'StarbunkCrusaders', "targetServer" = 'CovaDaxServer'
WHERE "sourceChannelId" = '757866614787014660' AND "targetChannelId" = '798613445301633137';

UPDATE "ChannelBridge" 
SET "sourceServer" = 'StarbunkStaging', "targetServer" = 'StarbunkCrusaders'
WHERE "sourceChannelId" = '856617421942030364' AND "targetChannelId" = '757866614787014660';

UPDATE "ChannelBridge" 
SET "sourceServer" = 'StarbunkStaging', "targetServer" = 'CovaDaxServer'
WHERE "sourceChannelId" = '856617421942030364' AND "targetChannelId" = '798613445301633137';

UPDATE "ChannelBridge" 
SET "sourceServer" = 'CovaDaxServer', "targetServer" = 'StarbunkCrusaders'
WHERE "sourceChannelId" = '798613445301633137' AND "targetChannelId" = '757866614787014660';

UPDATE "ChannelBridge" 
SET "sourceServer" = 'CovaDaxServer', "targetServer" = 'StarbunkStaging'
WHERE "sourceChannelId" = '798613445301633137' AND "targetChannelId" = '856617421942030364';

-- Starbunk channels (StarbunkCrusaders <-> Snowfall)
UPDATE "ChannelBridge" 
SET "sourceServer" = 'StarbunkCrusaders', "targetServer" = 'Snowfall'
WHERE "sourceChannelId" = '755579237934694420' AND "targetChannelId" = '755585038388691127';

UPDATE "ChannelBridge" 
SET "sourceServer" = 'Snowfall', "targetServer" = 'StarbunkCrusaders'
WHERE "sourceChannelId" = '755585038388691127' AND "targetChannelId" = '755579237934694420';

-- Memes channels (StarbunkCrusaders <-> Snowfall)
UPDATE "ChannelBridge" 
SET "sourceServer" = 'StarbunkCrusaders', "targetServer" = 'Snowfall'
WHERE "sourceChannelId" = '753251583084724371' AND "targetChannelId" = '697341904873979925';

UPDATE "ChannelBridge" 
SET "sourceServer" = 'Snowfall', "targetServer" = 'StarbunkCrusaders'
WHERE "sourceChannelId" = '697341904873979925' AND "targetChannelId" = '753251583084724371';

-- FF14 General channels (StarbunkCrusaders <-> Snowfall)
UPDATE "ChannelBridge" 
SET "sourceServer" = 'StarbunkCrusaders', "targetServer" = 'Snowfall'
WHERE "sourceChannelId" = '754485972774944778' AND "targetChannelId" = '696906700627640352';

UPDATE "ChannelBridge" 
SET "sourceServer" = 'Snowfall', "targetServer" = 'StarbunkCrusaders'
WHERE "sourceChannelId" = '696906700627640352' AND "targetChannelId" = '754485972774944778';

-- FF14 MSQ channels (StarbunkCrusaders <-> Snowfall)
UPDATE "ChannelBridge" 
SET "sourceServer" = 'StarbunkCrusaders', "targetServer" = 'Snowfall'
WHERE "sourceChannelId" = '697342576730177658' AND "targetChannelId" = '753251583084724372';

UPDATE "ChannelBridge" 
SET "sourceServer" = 'Snowfall', "targetServer" = 'StarbunkCrusaders'
WHERE "sourceChannelId" = '753251583084724372' AND "targetChannelId" = '697342576730177658';

-- Screenshots channels (StarbunkCrusaders <-> Snowfall)
UPDATE "ChannelBridge" 
SET "sourceServer" = 'StarbunkCrusaders', "targetServer" = 'Snowfall'
WHERE "sourceChannelId" = '753251583286050926' AND "targetChannelId" = '755575759753576498';

UPDATE "ChannelBridge" 
SET "sourceServer" = 'Snowfall', "targetServer" = 'StarbunkCrusaders'
WHERE "sourceChannelId" = '755575759753576498' AND "targetChannelId" = '753251583286050926';

-- Raiding channels (StarbunkCrusaders <-> Snowfall)
UPDATE "ChannelBridge" 
SET "sourceServer" = 'StarbunkCrusaders', "targetServer" = 'Snowfall'
WHERE "sourceChannelId" = '753251583286050928' AND "targetChannelId" = '699048771308224642';

UPDATE "ChannelBridge" 
SET "sourceServer" = 'Snowfall', "targetServer" = 'StarbunkCrusaders'
WHERE "sourceChannelId" = '699048771308224642' AND "targetChannelId" = '753251583286050928';

-- Food channels (StarbunkCrusaders <-> Snowfall)
UPDATE "ChannelBridge" 
SET "sourceServer" = 'StarbunkCrusaders', "targetServer" = 'Snowfall'
WHERE "sourceChannelId" = '696948268579553360' AND "targetChannelId" = '755578695011270707';

UPDATE "ChannelBridge" 
SET "sourceServer" = 'Snowfall', "targetServer" = 'StarbunkCrusaders'
WHERE "sourceChannelId" = '755578695011270707' AND "targetChannelId" = '696948268579553360';

-- Pets channels (StarbunkCrusaders <-> Snowfall)
UPDATE "ChannelBridge" 
SET "sourceServer" = 'StarbunkCrusaders', "targetServer" = 'Snowfall'
WHERE "sourceChannelId" = '696948305586028544' AND "targetChannelId" = '755578835122126898';

UPDATE "ChannelBridge" 
SET "sourceServer" = 'Snowfall', "targetServer" = 'StarbunkCrusaders'
WHERE "sourceChannelId" = '755578835122126898' AND "targetChannelId" = '696948305586028544';

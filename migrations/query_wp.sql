SELECT id, name, "contractType", "billingType", "jiraProjectKeys", "includedTicketTypes", "includeEvoEstimates", "includeEvoTM", "lastSyncedAt"
FROM "WorkPackage"
WHERE name LIKE '%IMPREX%';

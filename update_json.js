const fs = require('fs');
const path = require('path');

function updateJson(filePath, updates) {
    const fullPath = path.resolve(filePath);
    const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    Object.assign(content, updates);
    fs.writeFileSync(fullPath, JSON.stringify(content, null, 4), 'utf8');
}

const esUpdates = {
    notifications: {
        titles: {
            reviewCreated: "Nueva reclamación de horas",
            reviewCreatedAssigned: "Nueva reclamación de horas (Asignada)",
            reviewApproved: "Reclamación Aprobada",
            reviewRejected: "Reclamación Rechazada",
            reviewDecidedApproved: "Reclamación Resuelta (Aprobada)",
            reviewDecidedRejected: "Reclamación Resuelta (Rechazada)"
        },
        messages: {
            reviewCreated: "El usuario ha solicitado revisar {count} imputaciones en el WP {wp}.",
            reviewCreatedAssigned: "Se ha solicitado revisar {count} imputaciones en el WP {wp} de tu cliente.",
            reviewApproved: "Tu reclamación de horas ha sido aprobada. Se han devuelto {count} imputaciones. Notas: {notes}",
            reviewRejected: "Tu reclamación de horas ha sido rechazada. Notas: {notes}",
            reviewDecidedApproved: "Se ha aprobado una reclamación en el WP {wp}. Notas: {notes}",
            reviewDecidedRejected: "Se ha rechazado una reclamación en el WP {wp}. Notas: {notes}"
        }
    },
    regularizations: {
        types: {
            return: "Devolución de horas"
        }
    }
};

const enUpdates = {
    notifications: {
        titles: {
            reviewCreated: "New hours claim",
            reviewCreatedAssigned: "New hours claim (Assigned)",
            reviewApproved: "Claim Approved",
            reviewRejected: "Claim Rejected",
            reviewDecidedApproved: "Claim Resolved (Approved)",
            reviewDecidedRejected: "Claim Resolved (Rejected)"
        },
        messages: {
            reviewCreated: "The user has requested to review {count} entries in WP {wp}.",
            reviewCreatedAssigned: "A review of {count} entries in WP {wp} of your client has been requested.",
            reviewApproved: "Your hours claim has been approved. {count} entries have been returned. Notes: {notes}",
            reviewRejected: "Your hours claim has been rejected. Notes: {notes}",
            reviewDecidedApproved: "A claim has been approved in WP {wp}. Notes: {notes}",
            reviewDecidedRejected: "A claim has been rejected in WP {wp}. Notes: {notes}"
        }
    },
    regularizations: {
        types: {
            return: "Hours refund"
        }
    }
};

updateJson('messages/es.json', esUpdates);
updateJson('messages/en.json', enUpdates);
console.log('JSON files updated successfully');

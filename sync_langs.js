const fs = require('fs');
const path = require('path');

function updateJson(filePath, updates) {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) return;
    const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    Object.assign(content, updates);
    fs.writeFileSync(fullPath, JSON.stringify(content, null, 4), 'utf8');
}

const frUpdates = {
    errors: {
        required: "{field} est obligatoire",
        maxLength: "{field} ne peut pas dépasser {count} caractères",
        notFound: "{item} non trouvé",
        alreadyExists: "{item} existe déjà",
        unknown: "Erreur inconnue",
        generic: "Une erreur s'est produite lors du traitement de la demande",
        unauthorized: "Vous n'avez pas les permissions pour effectuer cette action",
        emergencyStop: "Synchronisation interrompue par un arrêt d'urgence",
        noPeriods: "Aucune période de validité définie",
        notApplicable: "Synchronisation non applicable pour ce type de contrat",
        invalidFile: "Le fichier n'est pas valide ou est vide",
        noFile: "Aucun fichier téléchargé",
        deleteError: "Erreur lors de la suppression de {item}",
        updateError: "Erreur lors de la mise à jour de {item}",
        createError: "Erreur lors de la création de {item}",
        syncError: "Erreur de synchronisation de {item}",
        claimError: "Erreur lors du traitement de la réclamation",
        migrationError: "Erreur lors de l'application de la migration",
        wrongFormat: "Format de fichier incorrect"
    },
    notifications: {
        titles: {
            reviewCreated: "Nouvelle réclamation d'heures",
            reviewCreatedAssigned: "Nouvelle réclamation d'heures (Assignée)",
            reviewApproved: "Réclamation Approuvée",
            reviewRejected: "Réclamation Rejetée",
            reviewDecidedApproved: "Réclamation Résolue (Approuvée)",
            reviewDecidedRejected: "Réclamation Résolue (Rejetée)"
        },
        messages: {
            reviewCreated: "L'utilisateur a demandé de réviser {count} imputations dans le WP {wp}.",
            reviewCreatedAssigned: "Une révision de {count} imputations dans le WP {wp} de votre client a été demandée.",
            reviewApproved: "Votre réclamation d'heures a été approuvée. {count} imputations ont été retournées. Notes : {notes}",
            reviewRejected: "Votre réclamation d'heures a été rejetée. Notes : {notes}",
            reviewDecidedApproved: "Une réclamation a été approuvée dans le WP {wp}. Notes : {notes}",
            reviewDecidedRejected: "Une réclamation a été rejetée dans le WP {wp}. Notes : {notes}"
        }
    },
    regularizations: {
        types: {
            return: "Remboursement d'heures"
        }
    }
};

const itUpdates = {
    errors: {
        required: "{field} è obbligatorio",
        maxLength: "{field} non può superare {count} caratteri",
        notFound: "{item} non trovato",
        alreadyExists: "{item} esiste già",
        unknown: "Errore sconosciuto",
        generic: "Si è verificato un errore durante l'elaborazione della richiesta",
        unauthorized: "Non hai i permessi per eseguire questa azione",
        emergencyStop: "Sincronizzazione interrotta da arresto di emergenza",
        noPeriods: "Nessun periodo di validità definito",
        notApplicable: "Sincronizzazione non applicabile per questo tipo di contratto",
        invalidFile: "Il file non è valido o è vuoto",
        noFile: "Nessun file caricato",
        deleteError: "Errore durante l'eliminazione di {item}",
        updateError: "Errore durante l'aggiornamento di {item}",
        createError: "Errore durante la creazione di {item}",
        syncError: "Errore durante la sincronizzazione di {item}",
        claimError: "Errore durante l'elaborazione del reclamo",
        migrationError: "Errore durante l'applicazione della migrazione",
        wrongFormat: "Formato file non corretto"
    },
    notifications: {
        titles: {
            reviewCreated: "Nuovo reclamo ore",
            reviewCreatedAssigned: "Nuovo reclamo ore (Assegnato)",
            reviewApproved: "Reclamo Approvato",
            reviewRejected: "Reclamo Rifiutato",
            reviewDecidedApproved: "Reclamo Risolto (Approvato)",
            reviewDecidedRejected: "Reclamo Risolto (Rifiutato)"
        },
        messages: {
            reviewCreated: "L'utente ha richiesto di rivedere {count} imputazioni nel WP {wp}.",
            reviewCreatedAssigned: "È stata richiesta una revisione di {count} imputazioni nel WP {wp} del tuo cliente.",
            reviewApproved: "Il tuo reclamo ore è stato approvato. Sono state restituite {count} imputazioni. Note: {notes}",
            reviewRejected: "Il tuo reclamo ore è stato rifiutato. Note: {notes}",
            reviewDecidedApproved: "Un reclamo è stato approvato nel WP {wp}. Note: {notes}",
            reviewDecidedRejected: "Un reclamo è stato rifiutato nel WP {wp}. Note: {notes}"
        }
    },
    regularizations: {
        types: {
            return: "Rimborsi ore"
        }
    }
};

const ptUpdates = {
    errors: {
        required: "{field} é obrigatório",
        maxLength: "{field} não pode exceder {count} caracteres",
        notFound: "{item} não encontrado",
        alreadyExists: "{item} já existe",
        unknown: "Erro desconhecido",
        generic: "Ocorreu un erro ao processar a solicitação",
        unauthorized: "Você não tem permissão para realizar esta ação",
        emergencyStop: "Sincronização abortada por parada de emergência",
        noPeriods: "Nenhum período de validade definido",
        notApplicable: "Sincronização não aplicável para este tipo de contrato",
        invalidFile: "O arquivo é inválido ou está vazio",
        noFile: "Nenhum arquivo enviado",
        deleteError: "Erro ao excluir {item}",
        updateError: "Erro ao atualizar {item}",
        createError: "Erro ao criar {item}",
        syncError: "Erro ao sincronizar {item}",
        claimError: "Erro ao processar a reclamação",
        migrationError: "Erro ao aplicar a migração",
        wrongFormat: "Formato de arquivo incorreto"
    },
    notifications: {
        titles: {
            reviewCreated: "Nova reclamação de horas",
            reviewCreatedAssigned: "Nova reclamação de horas (Atribuída)",
            reviewApproved: "Reclamação Aprovada",
            reviewRejected: "Reclamação Rejeitada",
            reviewDecidedApproved: "Reclamação Resolvida (Aprovada)",
            reviewDecidedRejected: "Reclamação Resolvida (Rejeitada)"
        },
        messages: {
            reviewCreated: "O usuário solicitou a revisão de {count} lançamentos no WP {wp}.",
            reviewCreatedAssigned: "Foi solicitada uma revisão de {count} lançamentos no WP {wp} do seu cliente.",
            reviewApproved: "Sua reclamação de horas foi aprovada. {count} lançamentos foram devolvidos. Notas: {notes}",
            reviewRejected: "Sua reclamação de horas foi rejeitada. Notas: {notes}",
            reviewDecidedApproved: "Uma reclamação foi aprovada no WP {wp}. Notas: {notes}",
            reviewDecidedRejected: "Uma reclamação foi rejeitada no WP {wp}. Notas: {notes}"
        }
    },
    regularizations: {
        types: {
            return: "Devolução de horas"
        }
    }
};

const hiUpdates = {
    errors: {
        required: "{field} अनिवार्य है",
        maxLength: "{field} {count} वर्णों से अधिक नहीं हो सकता",
        notFound: "{item} नहीं मिला",
        alreadyExists: "{item} पहले से मौजूद है",
        unknown: "अज्ञात त्रुटि",
        generic: "अनुरोध को संसाधित करते समय एक त्रुटि हुई",
        unauthorized: "आपके पास इस क्रिया को करने की अनुमति नहीं है",
        emergencyStop: "आपातकालीन रोक द्वारा सिंक निरस्त",
        noPeriods: "कोई वैधता अवधि परिभाषित नहीं",
        notApplicable: "इस अनुबंध प्रकार के लिए सिंक लागू नहीं है",
        invalidFile: "फ़ाइल अमान्य या खाली है",
        noFile: "कोई फ़ाइल अपलोड नहीं की गई",
        deleteError: "{item} को हटाने में त्रुटि",
        updateError: "{item} को अपडेट करने में त्रुटि",
        createError: "{item} बनाने में त्रुटि",
        syncError: "{item} को सिंक करने में त्रुटि",
        claimError: "दावे को संसाधित करने में त्रुटि",
        migrationError: "माइग्रेशन लागू करने में त्रुटि",
        wrongFormat: "गलत फ़ाइल प्रारूप"
    },
    notifications: {
        titles: {
            reviewCreated: "नया घंटे दावा",
            reviewCreatedAssigned: "नया घंटे दावा (असाइन किया गया)",
            reviewApproved: "दावा स्वीकृत",
            reviewRejected: "दावा अस्वीकृत",
            reviewDecidedApproved: "दावा हल (स्वीकृत)",
            reviewDecidedRejected: "दावा हल (अस्वीकृत)"
        },
        messages: {
            reviewCreated: "उपयोगकर्ता ने WP {wp} में {count} प्रविष्टियों की समीक्षा करने का अनुरोध किया है।",
            reviewCreatedAssigned: "आपके क्लाइंट के WP {wp} में {count} प्रविष्टियों की समीक्षा का अनुरोध किया गया है।",
            reviewApproved: "आपका घंटे दावा सफल रहा। {count} प्रविष्टियाँ लौटा दी गई हैं। नोट्स: {notes}",
            reviewRejected: "आपका घंटे दावा अस्वीकृत कर दिया गया है। नोट्स: {notes}",
            reviewDecidedApproved: "WP {wp} में एक दावा स्वीकृत हो गया है। नोट्स: {notes}",
            reviewDecidedRejected: "WP {wp} में एक दावा अस्वीकृत कर दिया गया है। नोट्स: {notes}"
        }
    },
    regularizations: {
        types: {
            return: "घंटे वापसी"
        }
    }
};

updateJson('messages/fr.json', frUpdates);
updateJson('messages/it.json', itUpdates);
updateJson('messages/pt.json', ptUpdates);
updateJson('messages/hi.json', hiUpdates);

console.log('Language files synchronized successfully');

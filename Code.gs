/**
 * @fileoverview Audit de structure d'agenda - Version 2.0 (Anti-biais)
 * @author Fabrice Faucheux / Gemini
 */

const CONFIG_AUDIT = {
  NOM_ENTREPRISE: "L'atelier informatique",
  PERIODE_ANALYSE_JOURS: 120, 
  SEUIL_HEBDO: 7,            
  EXCLUSIONS_MOTS: ["repas", "déjeuner", "lunch", "pause", "anniversaire", "congés", "absent", "lieu de travail"],
  TYPES_EXCLUS: ["workingLocation", "outOfOffice", "focusTime"],
  COULEURS: {
    hebdo: "#1a73e8",   
    mensuel: "#f29900", 
    alerte: "#d93025",
    autre: "#9aa0a6"
  }
};

const cleanStr = (str) => str ? str.replace(/[\uFFFD]/g, '').trim() : "";

// Fonction utilitaire pour trouver la valeur la plus fréquente (le "Mode")
const getMode = (arr) => {
  if (arr.length === 0) return null;
  const modeMap = {};
  let maxEl = arr[0], maxCount = 1;
  for (let i = 0; i < arr.length; i++) {
    const el = arr[i];
    modeMap[el] = (modeMap[el] || 0) + 1;
    if (modeMap[el] > maxCount) {
      maxEl = el;
      maxCount = modeMap[el];
    }
  }
  return maxEl;
};

const auditerStructureAgenda = () => {
  try {
    const calendarId = 'primary';
    const timeZone = Calendar.Settings.get('timezone').value;
    const now = new Date();
    // Calcul du lundi de la semaine actuelle
    const jourCourant = now.getDay(); 
    const decalageLundi = now.getDate() - jourCourant + (jourCourant === 0 ? -6 : 1);
    const debutSemaine = new Date(now.setDate(decalageLundi));
    debutSemaine.setHours(0, 0, 0, 0);

    const future = new Date(debutSemaine);
    future.setDate(debutSemaine.getDate() + CONFIG_AUDIT.PERIODE_ANALYSE_JOURS);

    // 1. GESTION DU BIAIS DE PAGINATION
    let allEvents = [];
    let pageToken = null;
    do {
      const reponse = Calendar.Events.list(calendarId, {
        timeMin: debutSemaine.toISOString(), // Utilisation du lundi à 00h00
        timeMax: future.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        pageToken: pageToken,
        maxResults: 250
      });
      if (reponse.items) allEvents = allEvents.concat(reponse.items);
      pageToken = reponse.nextPageToken;
    } while (pageToken);
    
    // 2. GROUPEMENT ET ANALYSE DES SÉRIES
    const seriesData = allEvents.reduce((acc, evt) => {
      if (!evt.recurringEventId) return acc;
      if (CONFIG_AUDIT.TYPES_EXCLUS.includes(evt.eventType || 'default')) return acc;
      
      const titre = (evt.summary || "").toLowerCase();
      if (CONFIG_AUDIT.EXCLUSIONS_MOTS.some(mot => titre.includes(mot.toLowerCase()))) return acc;

      const id = evt.recurringEventId;
      if (!acc[id]) {
        acc[id] = { titre: cleanStr(evt.summary), link: evt.htmlLink, dates: [], times: [], durations: [], rawEvents: [] };
      }
      
      const start = new Date(evt.start.dateTime || evt.start.date);
      const end = new Date(evt.end.dateTime || evt.end.date);
      
      acc[id].dates.push(start.getDay());
      if (evt.start.dateTime) {
        acc[id].times.push(Utilities.formatDate(start, timeZone, "HH:mm"));
        acc[id].durations.push(Math.round((end - start) / (1000 * 60)));
      }
      acc[id].rawEvents.push(evt);
      return acc;
    }, {});

    const joursSemaine = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const structure = { 1:[], 2:[], 3:[], 4:[], 5:[] };
    const chevauchements = [];

    // 3. TRAITEMENT DES SÉRIES (BIAIS DES EXCEPTIONS)
    Object.keys(seriesData).forEach(id => {
      const s = seriesData[id];
      const nbOccurences = s.rawEvents.length;
      
      // On prend la valeur "majoritaire" pour le jour et l'heure
      const jourIndex = getMode(s.dates);
      const heureDebut = s.times.length > 0 ? getMode(s.times) : "Journée";
      const dureeMoyenne = s.durations.length > 0 ? getMode(s.durations) : 0;

      if (jourIndex === 0 || jourIndex === 6 || !structure[jourIndex]) return;

      // Logique de fréquence
      let frequence = "Annuel/Rare";
      if (nbOccurences >= CONFIG_AUDIT.SEUIL_HEBDO) frequence = "Hebdo";
      else if (nbOccurences >= 5) frequence = "Bi-mensuel";
      else if (nbOccurences >= 3) frequence = "Mensuel";

      if (frequence === "Annuel/Rare") return;

      // Calcul des minutes pour les chevauchements
      const [h, m] = heureDebut !== "Journée" ? heureDebut.split(':').map(Number) : [0, 0];
      const startMins = h * 60 + m;
      const endMins = startMins + dureeMoyenne;

      const infoSerie = {
        titre: s.titre,
        link: s.link,
        heure: heureDebut,
        startMins: startMins,
        endMins: endMins,
        duree: dureeMoyenne,
        frequence: frequence,
        estJournee: heureDebut === "Journée"
      };

      // 4. DÉTECTION FINE DES CHEVAUCHEMENTS
      structure[jourIndex].forEach(existante => {
        if (!infoSerie.estJournee && !existante.estJournee) {
          // Logique d'intersection : DébutA < FinB ET FinA > DébutB
          if (infoSerie.startMins < existante.endMins && infoSerie.endMins > existante.startMins) {
            chevauchements.push({
              jour: joursSemaine[jourIndex],
              heure: `${infoSerie.heure} / ${existante.heure}`,
              t1: existante.titre,
              t2: infoSerie.titre,
              l1: existante.link,
              l2: infoSerie.link
            });
          }
        }
      });

      structure[jourIndex].push(infoSerie);
    });

    const zonesBlanches = Object.keys(structure).filter(j => structure[j].length === 0).map(j => joursSemaine[j]);
    envoyerEmailAudit(structure, zonesBlanches, chevauchements, joursSemaine, CONFIG_AUDIT.PERIODE_ANALYSE_JOURS);

  } catch (e) {
    Logger.log("Erreur : " + e.stack);
  }
};

const envoyerEmailAudit = (structure, zonesBlanches, chevauchements, nomsJours, nbJours) => {
  const emailDestinataire = Session.getActiveUser().getEmail();
  
  let html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
  </head>
  <body style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; color: #3c4043; line-height: 1.5; margin: auto; background-color: #f1f3f4; padding: 20px;">
    <div style="background: white; border-radius: 12px; overflow: hidden; border: 1px solid #ddd; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      
      <div style="background: linear-gradient(135deg, #1a73e8, #0045a1); color: white; padding: 30px; text-align: center;">
        <h1 style="margin: 0; font-size: 22px;">Audit structurel d'agenda</h1>
        <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 14px;">Votre squelette de collaboration systématique</p>
      </div>
      
      <div style="padding: 25px; background-color: #ffffff;">
        
        <div style="background: #e6f4ea; padding: 15px; border-radius: 10px; margin-bottom: 25px; border-left: 5px solid #188038;">
          <h3 style="color: #137333; margin-top: 0; font-size: 16px;">&#127775; Vos zones blanches</h3>
          <p style="font-size: 13px; margin-bottom: 10px; color: #137333;">Jours sans aucune contrainte de réunion récurrente :</p>
          <div style="font-weight: bold; font-size: 18px; color: #188038;">
            ${zonesBlanches.length > 0 ? zonesBlanches.join(', ') : "Aucun jour 100% libre..."}
          </div>
        </div>

        ${chevauchements.length > 0 ? `
        <div style="background: #fce8e6; padding: 15px; border-radius: 10px; margin-bottom: 25px; border-left: 5px solid #d93025;">
          <h3 style="color: #d93025; margin-top: 0; font-size: 16px;">&#9888; Chevauchements détectés</h3>
          <ul style="font-size: 12px; padding-left: 20px; color: #b71c1c; margin: 0;">
            ${chevauchements.map(c => `<li style="margin-bottom:8px;"><b>${c.jour} à ${c.heure}</b> : <br><a href="${c.l1}" style="color:#d93025;">${c.t1}</a> <br>vs<br> <a href="${c.l2}" style="color:#d93025;">${c.t2}</a></li>`).join('')}
          </ul>
        </div>` : ''}

        <h3 style="font-size: 15px; color: #5f6368; border-bottom: 2px solid #f1f3f4; padding-bottom: 8px;">Récurrences hebdomadaires & mensuelles</h3>
  `;

  [1, 2, 3, 4, 5].forEach(j => {
    const events = structure[j].sort((a, b) => a.heure.localeCompare(b.heure));
    const totalMinutes = events.reduce((sum, e) => sum + e.duree, 0);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const dureeLabel = totalMinutes > 0 ? `(${h}h${m > 0 ? m : '00'} fixe)` : '';

    html += `
      <div style="margin-top: 25px;">
        <div style="font-weight: bold; font-size: 15px; color: #1a73e8; border-bottom: 1px solid #e8f0fe; padding-bottom: 5px;">
          ${nomsJours[j]} &nbsp;&nbsp; 
          <span style="font-weight: normal; font-size: 11px; color: #9aa0a6;">${events.length} série(s) ${dureeLabel}</span>
        </div>
        ${events.length === 0 ? '<div style="font-size: 12px; color: #9aa0a6; padding: 15px; font-style: italic;">Aucune réunion systématique.</div>' : 
          events.map(e => `
            <a href="${e.link}" style="text-decoration:none; color:inherit; display:block; margin: 8px 0;">
              <div style="font-size: 13px; border-left: 4px solid ${
                e.frequence === 'Hebdo' ? CONFIG_AUDIT.COULEURS.hebdo : 
                (e.frequence === 'Bi-mensuel' ? CONFIG_AUDIT.COULEURS.mensuel : CONFIG_AUDIT.COULEURS.autre)
              }; padding: 10px 12px; background: #f8f9fa; border-radius: 0 8px 8px 0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td><b style="color:#202124;">${e.heure}</b> - ${e.titre}</td>
                    <td align="right" style="font-size: 11px; color: #70757a; font-weight: bold; white-space: nowrap; padding-left: 10px;">${e.frequence}</td>
                  </tr>
                </table>
              </div>
            </a>
          `).join('')
        }
      </div>
    `;
  });

  html += `
        <div style="margin-top: 35px; padding-top: 15px; border-top: 1px solid #eee; font-size: 11px; color: #9aa0a6; text-align: center; font-style: italic;">
          Analyse basée sur les ${nbJours} prochains jours.<br>
          Les types "Lieu de travail", "Repas" et "Anniversaires" sont exclus.
        </div>
      </div>
    </div>
  </body>
  </html>`;

  // Utilisation de GmailApp avec options de No-Reply et Nom d'expéditeur
  GmailApp.sendEmail(emailDestinataire, "Audit structurel : Votre squelette de semaine", "", {
    htmlBody: html,
    name: "Assistant Productivité (No-Reply)",
    noReply: true
  });
};

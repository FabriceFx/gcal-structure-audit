/**
 * @fileoverview Audit de structure d'agenda - Version 2.2 (Style Material Design)
 * @author Fabrice Faucheux / Gemini
 */

const CONFIG_AUDIT = {
  NOM_ENTREPRISE: " ",
  PERIODE_ANALYSE_JOURS: 120, 
  SEUIL_HEBDO: 7,            
  EXCLUSIONS_MOTS: ["repas", "déjeuner", "lunch", "pause", "anniversaire", "congés", "absent", "lieu de travail"],
  TYPES_EXCLUS: ["workingLocation", "outOfOffice", "focusTime"],
  COULEURS: {
    googleBlue: "#1a73e8",
    googleRed: "#d93025",
    googleGreen: "#1e8e3e",
    googleYellow: "#f9ab00",
    greyText: "#3c4043",
    lightGrey: "#f8f9fa",
    border: "#dadce0"
  }
};

const cleanStr = (str) => str ? str.replace(/[\uFFFD]/g, '').trim() : "";

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
    const settings = Calendar.Settings.get('timezone');
    const timeZone = settings ? settings.value : "Europe/Paris";
    const now = new Date();
    
    const jourCourant = now.getDay(); 
    const decalageLundi = now.getDate() - jourCourant + (jourCourant === 0 ? -6 : 1);
    const debutSemaine = new Date(now.setDate(decalageLundi));
    debutSemaine.setHours(0, 0, 0, 0);

    const future = new Date(debutSemaine);
    future.setDate(debutSemaine.getDate() + CONFIG_AUDIT.PERIODE_ANALYSE_JOURS);

    let allEvents = [];
    let pageToken = null;
    do {
      const reponse = Calendar.Events.list(calendarId, {
        timeMin: debutSemaine.toISOString(),
        timeMax: future.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        pageToken: pageToken,
        maxResults: 250
      });
      if (reponse.items) {
        const filtered = reponse.items.filter(evt => {
          const self = evt.attendees ? evt.attendees.find(a => a.self) : null;
          const status = self ? self.responseStatus : 'accepted';
          return status !== 'declined' && !CONFIG_AUDIT.TYPES_EXCLUS.includes(evt.eventType || 'default');
        });
        allEvents = allEvents.concat(filtered);
      }
      pageToken = reponse.nextPageToken;
    } while (pageToken);
    
    const seriesData = allEvents.reduce((acc, evt) => {
      if (!evt.recurringEventId) return acc;
      const titre = (evt.summary || "").toLowerCase();
      if (CONFIG_AUDIT.EXCLUSIONS_MOTS.some(mot => titre.includes(mot.toLowerCase()))) return acc;

      const id = evt.recurringEventId;
      if (!acc[id]) {
        acc[id] = { 
          id: id, titre: cleanStr(evt.summary), link: evt.htmlLink, 
          datesIndices: [], times: [], durations: [], datesReelles: [], rawEvents: [] 
        };
      }
      const start = new Date(evt.start.dateTime || evt.start.date);
      const end = new Date(evt.end.dateTime || evt.end.date);
      acc[id].datesIndices.push(start.getDay());
      acc[id].datesReelles.push((evt.start.dateTime || evt.start.date).split('T')[0]);
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

    Object.keys(seriesData).forEach(id => {
      const s = seriesData[id];
      const nbOccurences = s.rawEvents.length;
      const jourIndex = getMode(s.datesIndices);
      const heureDebut = s.times.length > 0 ? getMode(s.times) : "Journée";
      const dureeMoyenne = s.durations.length > 0 ? getMode(s.durations) : 0;

      if (jourIndex === 0 || jourIndex === 6 || !structure[jourIndex]) return;

      let frequence = "Rare";
      let color = CONFIG_AUDIT.COULEURS.googleBlue;
      if (nbOccurences >= CONFIG_AUDIT.SEUIL_HEBDO) { frequence = "Hebdo"; color = CONFIG_AUDIT.COULEURS.googleBlue; }
      else if (nbOccurences >= 5) { frequence = "Bi-mensuel"; color = CONFIG_AUDIT.COULEURS.googleYellow; }
      else if (nbOccurences >= 3) { frequence = "Mensuel"; color = CONFIG_AUDIT.COULEURS.googleGreen; }

      if (frequence === "Rare") return;

      const [h, m] = heureDebut !== "Journée" ? heureDebut.split(':').map(Number) : [0, 0];
      const startMins = h * 60 + m;
      const infoSerie = {
        id: id, titre: s.titre, link: s.link, heure: heureDebut, 
        startMins: startMins, endMins: startMins + dureeMoyenne, 
        duree: dureeMoyenne, frequence: frequence, color: color,
        estJournee: heureDebut === "Journée", datesReelles: s.datesReelles
      };

      structure[jourIndex].forEach(existante => {
        if (!infoSerie.estJournee && !existante.estJournee) {
          if (infoSerie.startMins < existante.endMins && infoSerie.endMins > existante.startMins) {
            const dateCommune = infoSerie.datesReelles.find(d => existante.datesReelles.includes(d));
            if (dateCommune) {
              chevauchements.push({
                jour: joursSemaine[jourIndex], heure: `${infoSerie.heure} / ${existante.heure}`,
                t1: existante.titre, t2: infoSerie.titre, l1: existante.link, l2: infoSerie.link,
                info: `Conflit réel (ex: le ${dateCommune.split('-').reverse().join('/')})`
              });
            }
          }
        }
      });
      structure[jourIndex].push(infoSerie);
    });

    const zonesBlanches = Object.keys(structure).filter(j => structure[j].length === 0).map(j => joursSemaine[j]);
    envoyerEmailAudit(structure, zonesBlanches, chevauchements, joursSemaine, CONFIG_AUDIT.PERIODE_ANALYSE_JOURS);

  } catch (e) {
    Logger.log(e.stack);
  }
};

const envoyerEmailAudit = (structure, zonesBlanches, chevauchements, nomsJours, nbJours) => {
  const emailDestinataire = Session.getActiveUser().getEmail();
  const c = CONFIG_AUDIT.COULEURS;

  let html = `
  <!DOCTYPE html>
  <html>
  <head><meta charset="UTF-8"></head>
  <body style="font-family: 'Google Sans', Roboto, Segoe UI, Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 40px 10px; color: ${c.greyText};">
    
    <div style="max-width: 650px; margin: 0 auto; background-color: #ffffff; border: 1px solid ${c.border}; border-radius: 12px; box-shadow: 0 1px 3px rgba(60,64,67,0.15); overflow: hidden;">
      
      <!-- Header -->
      <div style="padding: 24px 32px; border-bottom: 1px solid ${c.border};">
        <table width="100%">
          <tr>
            <td>
              <h1 style="font-size: 22px; color: #202124; margin: 0; font-weight: 400;">Audit de structure d'agenda</h1>
              <p style="font-size: 14px; color: #5f6368; margin: 4px 0 0 0;">Analyse des récurrences sur les ${nbJours} prochains jours</p>
            </td>
            <td align="right">
              <div style="width: 40px; height: 40px; background: ${c.googleBlue}; border-radius: 50%; display: inline-block;"></div>
            </td>
          </tr>
        </table>
      </div>

      <div style="padding: 32px;">

        <!-- Zones Blanches Card -->
        <div style="background-color: #ffffff; border: 1px solid ${c.border}; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <div style="color: ${c.googleGreen}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px;">Focus & Disponibilité</div>
          <h2 style="font-size: 18px; color: #202124; margin: 0 0 12px 0; font-weight: 400;">Vos zones de liberté</h2>
          <div style="font-size: 15px; color: #202124;">
            ${zonesBlanches.length > 0 ? `Jours sans réunions récurrentes : <b style="color:${c.googleGreen};">${zonesBlanches.join(', ')}</b>` : "Aucun jour n'est totalement libre de séries."}
          </div>
        </div>

        <!-- Alert Card (Only if conflicts) -->
        ${chevauchements.length > 0 ? `
        <div style="background-color: #fce8e6; border: 1px solid #fad2cf; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <div style="color: ${c.googleRed}; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px;">Conflits à résoudre</div>
          ${chevauchements.map(ch => `
            <div style="margin-bottom: 12px; font-size: 14px;">
              <div style="font-weight: bold; color: #b71c1c;">${ch.jour} à ${ch.heure}</div>
              <div style="color: #5f6368;">${ch.t1} <span style="margin: 0 8px;">/</span> ${ch.t2}</div>
              <div style="font-size: 12px; font-style: italic;">${ch.info}</div>
            </div>
          `).join('')}
        </div>` : ''}

        <!-- Weekly Skeleton -->
        <h2 style="font-size: 14px; color: #5f6368; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; border-bottom: 1px solid ${c.border}; padding-bottom: 8px;">Squelette hebdomadaire</h2>
        
        ${[1, 2, 3, 4, 5].map(j => {
          const events = structure[j].sort((a, b) => a.startMins - b.startMins);
          return `
          <div style="margin-bottom: 24px;">
            <div style="font-size: 16px; font-weight: 500; color: #202124; margin-bottom: 12px;">${nomsJours[j]}</div>
            ${events.length === 0 ? `<div style="padding: 12px; border: 1px dashed ${c.border}; border-radius: 8px; font-size: 13px; color: #9aa0a6;">Journée flexible</div>` : 
              events.map(e => `
                <a href="${e.link}" style="text-decoration: none; display: block; margin-bottom: 8px;">
                  <div style="background: #ffffff; border: 1px solid ${c.border}; border-radius: 8px; padding: 12px 16px; transition: background 0.2s;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="60" style="font-size: 13px; color: #202124; font-weight: 500;">${e.heure}</td>
                        <td style="padding: 0 12px; font-size: 14px; color: #3c4043;">${e.titre}</td>
                        <td align="right">
                          <span style="display: inline-block; padding: 4px 12px; border-radius: 16px; font-size: 11px; font-weight: 500; color: white; background-color: ${e.color};">
                            ${e.frequence}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </div>
                </a>
              `).join('')
            }
          </div>`;
        }).join('')}

      </div>

      <!-- Footer -->
      <div style="padding: 24px; background-color: ${c.lightGrey}; border-top: 1px solid ${c.border}; text-align: center;">
        <p style="font-size: 11px; color: #70757a; margin: 0;">
          Ce rapport est généré automatiquement par Google Apps Script.<br>
          Il analyse uniquement vos séries récurrentes pour définir votre structure de travail.
        </p>
      </div>
    </div>
  </body>
  </html>`;

  GmailApp.sendEmail(emailDestinataire, "Audit structurel : Votre squelette de semaine", "", {
    htmlBody: html,
    name: "Audit Google Agenda",
    noReply: true
  });
};

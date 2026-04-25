# 📅 GCal Structure Audit

![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google-apps-script&logoColor=white)
![Google Calendar](https://img.shields.io/badge/Google%20Calendar-4285F4?style=for-the-badge&logo=google-calendar&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)

Audit de structure d'agenda est un outil de diagnostic avancé pour Google Calendar. Contrairement à une simple lecture d'événements, ce script analyse la **charpente de collaboration** d'un utilisateur en isolant les séries récurrentes pour identifier la charge fixe réelle et les zones de flexibilité.

## ✨ Fonctionnalités clés

* **Analyse du Squelette Hebdomadaire** : Identification et classification des séries d'événements (Hebdomadaires, Bi-mensuelles, Mensuelles).
* **Détection Intelligente des Conflits** : Analyse des intersections réelles d'intervalles de temps pour signaler les chevauchements de séries récurrentes.
* **Traitement Statistique** : Utilisation d'un calcul de "mode" pour déterminer l'heure et le jour habituels d'une série, ignorant les décalages ponctuels (jours fériés, congés).
* **Rapport Material Design** : Génération et envoi automatique d'un email HTML structuré incluant un récapitulatif visuel du squelette de la semaine.
* **Filtrage Personnalisable** : Exclusion automatique des mots-clés (repas, pauses) et des types d'événements spécifiques (Focus Time, Out of Office).

## 🛠️ Installation & Prérequis

### Prérequis
* Un compte Google (Google Workspace ou Gmail).
* L'API **Google Calendar** activée dans les services avancés de votre projet.

### Étapes d'installation
1.  Ouvrez [Google Apps Script](https://script.google.com/).
2.  Créez un nouveau projet nommé `GCal-Structure-Audit`.
3.  Copiez le contenu du fichier `Code.gs` dans l'éditeur de script.
4.  Dans la barre latérale gauche, cliquez sur le **+** à côté de **Services**, recherchez **Google Calendar API** et ajoutez-la.
5.  Configurez l'objet `CONFIG_AUDIT` au début du script selon vos besoins :
    ```javascript
    const CONFIG_AUDIT = {
      NOM_ENTREPRISE: "Votre Entreprise",
      PERIODE_ANALYSE_JOURS: 120, // Analyse sur 4 mois
      SEUIL_HEBDO: 7,            // Seuil de détection des récurrences
      // ... exclusions
    };
    ```

## 🚀 Utilisation

Pour lancer l'audit, exécutez simplement la fonction principale :
1.  Sélectionnez la fonction `auditerStructureAgenda` dans la barre d'outils de l'éditeur.
2.  Cliquez sur **Exécuter**.
3.  Autorisez les permissions nécessaires (Calendar et Gmail).
4.  Consultez votre boîte de réception pour recevoir le rapport détaillé.

## 💻 Technologies utilisées

* **Langage** : JavaScript (Google Apps Script Runtime).
* **APIs** : 
    * Google Calendar API (Listage et filtrage d'événements).
    * GmailApp (Envoi de rapports HTML).
* **Design** : HTML/CSS Inline (Style Material Design).

## 📄 Contribution & Licence

Les contributions sont les bienvenues pour améliorer l'analyse statistique ou le design du rapport.

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## ✍️ Auteur

* **Fabrice Faucheux** - *Développement initial & Concept*.

---

# 📅 GCal Structure Audit (EN)

![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google-apps-script&logoColor=white)
![Google Calendar](https://img.shields.io/badge/Google%20Calendar-4285F4?style=for-the-badge&logo=google-calendar&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)

Calendar Structure Audit is an advanced diagnostic tool for Google Calendar. Unlike a simple event reader, this script analyzes a user's **collaboration framework** by isolating recurring series to identify real fixed load and zones of flexibility.

## ✨ Key Features

* **Weekly Skeleton Analysis**: Identification and classification of event series (Weekly, Bi-monthly, Monthly).
* **Smart Conflict Detection**: Analysis of real time interval intersections to report overlaps in recurring series.
* **Statistical Processing**: Uses a "mode" calculation to determine the usual time and day of a series, ignoring one-off shifts (holidays, leaves).
* **Material Design Report**: Automatically generates and sends a structured HTML email including a visual summary of the week's skeleton.
* **Customizable Filtering**: Automatic exclusion of keywords (meals, breaks) and specific event types (Focus Time, Out of Office).

## 🛠️ Installation & Prerequisites

### Prerequisites
* A Google Account (Google Workspace or Gmail).
* **Google Calendar API** enabled in the advanced services of your project.

### Installation Steps
1.  Open [Google Apps Script](https://script.google.com/).
2.  Create a new project named `GCal-Structure-Audit`.
3.  Copy the content of the `Code.gs` file into the script editor.
4.  In the left sidebar, click the **+** next to **Services**, search for **Google Calendar API**, and add it.
5.  Configure the `CONFIG_AUDIT` object at the beginning of the script according to your needs:
    ```javascript
    const CONFIG_AUDIT = {
      NOM_ENTREPRISE: "Your Company",
      PERIODE_ANALYSE_JOURS: 120, // 4-month analysis
      SEUIL_HEBDO: 7,            // Threshold for recurrence detection
      // ... exclusions
    };
    ```

## 🚀 Usage

To start the audit, simply run the main function:
1.  Select the `auditerStructureAgenda` function in the editor toolbar.
2.  Click **Run**.
3.  Authorize the necessary permissions (Calendar and Gmail).
4.  Check your inbox to receive the detailed report.

## 💻 Technologies Used

* **Language**: JavaScript (Google Apps Script Runtime).
* **APIs**: 
    * Google Calendar API (Event listing and filtering).
    * GmailApp (HTML report delivery).
* **Design**: Inline HTML/CSS (Material Design style).

## 📄 Contribution & License

Contributions are welcome to improve statistical analysis or report design.

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

## ✍️ Author

* **Fabrice Faucheux** - *Initial Development & Concept*.

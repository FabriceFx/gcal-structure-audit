# GCal Structure Audit

Ce script Google Apps Script permet de réaliser un audit approfondi de la structure de collaboration systématique d'un utilisateur ou d'une organisation. Contrairement à une simple lecture d'agenda, il analyse la "charpente" de la semaine en isolant les récurrences pour identifier les zones de charge fixe.

## 🚀 Fonctionnalités clés

* **Analyse du squelette hebdomadaire** : Identification des séries hebdomadaires, bi-mensuelles et mensuelles.
* **Détection intelligente des chevauchements** : Le script ne se contente pas de comparer les heures de début ; il calcule l'intersection réelle des intervalles de temps (Début A < Fin B && Fin A > Début B).
* **Traitement statistique des exceptions** : Utilisation d'un calcul de "mode" pour identifier le jour et l'heure habituels d'une série, ignorant ainsi les déplacements exceptionnels dus aux jours fériés ou congés.
* **Rapport HTML automatisé** : Envoi d'un email structuré récapitulant les "zones blanches" (jours libres), les alertes de conflits et la répartition de la charge fixe par jour.
* **Gestion robuste des données** : Supporte la pagination de l'API Google Calendar (nextPageToken) pour traiter les agendas à gros volume.

## 🛠 Configuration

Le script est piloté par un objet `CONFIG_AUDIT` permettant de définir :
* La période d'analyse (par défaut 120 jours).
* Les mots-clés à exclure (repas, anniversaires, etc.).
* Les types d'événements à ignorer (Focus Time, Out of Office).

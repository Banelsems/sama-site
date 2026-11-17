/* Contenu du test : questions, réponses, textes des résultats, numéro WhatsApp. C'est le seul fichier à modifier. */
window.SAMA_QUIZ = {
 "version": "3.0",
 "brand": "SAMA SOURCING",
 "product": "Test « Score de préparation »",
 "based_on": "La Chine n'est pas le problème — checklist « Suis-je prêt ? », chapitre 8 (version courte : 2 questions de profil + 10 questions notées)",
 "config": {
  "whatsapp_number": "+8619824786223",
  "lead_prefix": "Q"
 },
 "blocks": [
  {
   "id": "B1",
   "title": "Planification de l'achat"
  },
  {
   "id": "B2",
   "title": "Connaissance du produit"
  },
  {
   "id": "B3",
   "title": "Sécurité de l'achat"
  },
  {
   "id": "B4",
   "title": "Sécurité du paiement"
  },
  {
   "id": "B5",
   "title": "Transport"
  },
  {
   "id": "B6",
   "title": "Douane"
  }
 ],
 "profile": [
  {
   "id": "P1",
   "text": "Que veux-tu acheter en Chine ?",
   "options": [
    {
     "id": "textile",
     "label": "Mode, tissus, vêtements",
     "short": "des vêtements et des tissus"
    },
    {
     "id": "electronique",
     "label": "Électronique, téléphones, accessoires",
     "short": "de l'électronique"
    },
    {
     "id": "chaussures",
     "label": "Chaussures, sacs, maroquinerie",
     "short": "des chaussures et de la maroquinerie"
    },
    {
     "id": "maison",
     "label": "Maison, déco, jouets, papeterie",
     "short": "des articles pour la maison"
    },
    {
     "id": "machines",
     "label": "Machines, véhicules, équipements",
     "short": "des machines ou des véhicules"
    },
    {
     "id": "autre",
     "label": "Autre secteur",
     "short": "un produit"
    }
   ]
  },
  {
   "id": "P2",
   "text": "Comment comptes-tu acheter ?",
   "options": [
    {
     "id": "travel",
     "label": "Je viens en Chine",
     "short": "en venant sur place"
    },
    {
     "id": "remote",
     "label": "À distance, depuis chez moi",
     "short": "à distance"
    },
    {
     "id": "undecided",
     "label": "Je ne sais pas encore",
     "short": "je ne sais pas encore comment"
    }
   ]
  }
 ],
 "questions": [
  {
   "id": "Q1",
   "block": "B1",
   "label": "Objectif clair",
   "critical": true,
   "text": "Tu peux dire, en une phrase, pourquoi tu achètes en Chine ?",
   "action": "Écris en une phrase : « J'achète [produit] pour [clients], dans une qualité [X], avec un budget de [Y]. »",
   "options": [
    {
     "id": "a",
     "label": "Oui, c'est écrit et je peux te la montrer",
     "p": 1,
     "s": "ok"
    },
    {
     "id": "b",
     "label": "Je l'ai en tête, mais rien n'est écrit",
     "p": 0,
     "s": "part"
    },
    {
     "id": "c",
     "label": "Non, je veux d'abord « voir »",
     "p": 0,
     "s": "no"
    }
   ],
   "missing": "un objectif clair et écrit"
  },
  {
   "id": "Q2",
   "block": "B2",
   "label": "Produit déjà vendu chez toi",
   "critical": false,
   "text": "Ce produit, tu l'as déjà acheté et revendu chez toi ?",
   "action": "Achète un petit lot chez un importateur de ta ville et garde une pièce de chaque qualité : c'est ta référence pour parler au fournisseur.",
   "options": [
    {
     "id": "a",
     "label": "Oui, chez des importateurs de ma ville",
     "p": 1,
     "s": "ok"
    },
    {
     "id": "b",
     "label": "J'ai vendu, mais un autre produit",
     "p": 0,
     "s": "part"
    },
    {
     "id": "c",
     "label": "Non, jamais",
     "p": 0,
     "s": "no"
    }
   ],
   "missing": "l'expérience de ce produit sur ton marché"
  },
  {
   "id": "Q4",
   "block": "B2",
   "label": "Ville chinoise du produit",
   "critical": false,
   "text": "Tu sais dans quelle ville chinoise se trouve ton produit ?",
   "action": "Vérifie sur deux sources : Guangzhou pour la mode, Shenzhen pour l'électronique, Yiwu pour les petites marchandises, Foshan pour les meubles.",
   "options": [
    {
     "id": "a",
     "label": "Oui, précisément",
     "p": 1,
     "s": "ok"
    },
    {
     "id": "b",
     "label": "Je crois, sans certitude",
     "p": 0,
     "s": "part"
    },
    {
     "id": "c",
     "label": "Non",
     "p": 0,
     "s": "no"
    }
   ],
   "missing": "la ville chinoise où se fabrique ton produit"
  },
  {
   "id": "Q5",
   "block": "B3",
   "label": "Reconnaître usine ou revendeur",
   "critical": false,
   "text": "Face à un vendeur, tu sais s'il est usine, revendeur, grossiste ou agent ?",
   "action": "Envoie ce message : « Vous êtes l'usine ou un revendeur ? Pouvez-vous m'envoyer une vidéo de production ? » Puis vérifie.",
   "options": [
    {
     "id": "a",
     "label": "Oui, je pose la question et je vérifie",
     "p": 1,
     "s": "ok"
    },
    {
     "id": "b",
     "label": "Je sais que ça existe, mais je ne vérifie pas",
     "p": 0,
     "s": "part"
    },
    {
     "id": "c",
     "label": "Non",
     "p": 0,
     "s": "no"
    }
   ],
   "missing": "savoir reconnaître une usine d'un revendeur"
  },
  {
   "id": "Q7",
   "block": "B2",
   "label": "Fiche produit écrite",
   "critical": true,
   "text": "Tu as écrit précisément ce que tu veux commander, prêt à envoyer au fournisseur ?",
   "action": "Sur une page : produit, quantité, qualité, emballage, délai, prix visé. C'est ce document qui évite de recevoir autre chose que ce que tu as payé.",
   "options": [
    {
     "id": "a",
     "label": "Oui : quantité, qualité, emballage, délai, prix",
     "p": 1,
     "s": "ok"
    },
    {
     "id": "b",
     "label": "J'ai quelques notes, pas complètes",
     "p": 0,
     "s": "part"
    },
    {
     "id": "c",
     "label": "Non, j'envoie des photos et des messages",
     "p": 0,
     "s": "no"
    }
   ],
   "missing": "une fiche produit écrite pour le fournisseur"
  },
  {
   "id": "Q8",
   "block": "B1",
   "label": "Coût de revient",
   "critical": false,
   "text": "Tu as calculé ton coût de revient par pièce ?",
   "action": "Formule : (prix usine + transport + douane + frais + change) divisé par les pièces vendables. Ajoute 5 à 10 % de pertes.",
   "options": [
    {
     "id": "a",
     "label": "Oui, chiffré, transport et douane compris",
     "p": 1,
     "s": "ok"
    },
    {
     "id": "b",
     "label": "J'ai estimé en gros",
     "p": 0,
     "s": "part"
    },
    {
     "id": "c",
     "label": "Non, je regarde surtout le prix usine",
     "p": 0,
     "s": "no"
    }
   ],
   "missing": "ton coût de revient par pièce"
  },
  {
   "id": "Q9",
   "block": "B4",
   "label": "Paiement sûr",
   "critical": true,
   "text": "Tu sais comment tu vas payer, et qui porte le risque ?",
   "action": "Choisis ton moyen, écris qui paie quoi et quand, et exige une preuve pour chaque paiement. Ne paie jamais tout d'avance à un inconnu.",
   "options": [
    {
     "id": "a",
     "label": "Oui, le moyen est choisi et la trace est prévue",
     "p": 1,
     "s": "ok"
    },
    {
     "id": "b",
     "label": "Je sais, mais rien n'est décidé",
     "p": 0,
     "s": "part"
    },
    {
     "id": "c",
     "label": "Non, je verrai sur place",
     "p": 0,
     "s": "no"
    }
   ],
   "missing": "un moyen de paiement sûr et décidé"
  },
  {
   "id": "Q10",
   "block": "B5",
   "label": "Transitaire",
   "critical": false,
   "text": "Tu as choisi un transitaire, et vérifié son volume de départs ?",
   "action": "Pose trois questions à deux transitaires : combien de départs par mois vers ta ville, ont-ils leur propre entrepôt, qui paie la casse.",
   "options": [
    {
     "id": "a",
     "label": "Oui, choisi, et je connais ses départs",
     "p": 1,
     "s": "ok"
    },
    {
     "id": "b",
     "label": "J'ai des contacts, pas de choix",
     "p": 0,
     "s": "part"
    },
    {
     "id": "c",
     "label": "Non, pas encore",
     "p": 0,
     "s": "no"
    }
   ],
   "missing": "un transitaire de confiance"
  },
  {
   "id": "Q11",
   "block": "B3",
   "label": "Une protection",
   "critical": false,
   "text": "Tu as prévu au moins une protection pour ta commande ?",
   "action": "Combines-en au moins deux : paiement échelonné, inspection avant le solde, achat groupé, agent. Une seule ne suffit jamais.",
   "options": [
    {
     "id": "a",
     "label": "Oui, au moins une, et c'est décidé",
     "p": 1,
     "s": "ok"
    },
    {
     "id": "b",
     "label": "J'y pense, rien de décidé",
     "p": 0,
     "s": "part"
    },
    {
     "id": "c",
     "label": "Non",
     "p": 0,
     "s": "no"
    }
   ],
   "missing": "une protection pour ta commande"
  },
  {
   "id": "Q15",
   "block": "B6",
   "label": "Douane vérifiée",
   "critical": false,
   "text": "Les taxes et règles d'import de ton pays ont été vérifiées par un professionnel ?",
   "action": "Demande à un transitaire ou à un déclarant : documents exigés, taxes estimées, produits contrôlés pour ton produit dans ton pays.",
   "options": [
    {
     "id": "a",
     "label": "Oui, par un transitaire ou un déclarant",
     "p": 1,
     "s": "ok"
    },
    {
     "id": "b",
     "label": "J'ai des informations, pas confirmées",
     "p": 0,
     "s": "part"
    },
    {
     "id": "c",
     "label": "Non",
     "p": 0,
     "s": "no"
    }
   ],
   "missing": "les règles de douane vérifiées"
  }
 ],
 "tiers": [
  {
   "id": "T1",
   "min": 0,
   "max": 4,
   "headline": "Pas encore prêt.",
   "subline": "Ce n'est pas un échec : c'est le premier pas pour planifier ton achat clairement. Et on est là pour t'aider.",
   "wa_message": "Bonjour Sama, j'ai fait le test Score de préparation : {score}/{total}. Je veux acheter {produit} en Chine ({mode}), mais je ne sais pas par où commencer. Il me manque surtout : {manques}. Par quoi je dois commencer ? (Réf. {lead_id})",
   "reading": {
    "travel": "À ce stade, venir en Chine te coûterait plus cher que ce que ça te rapporterait : billet, visa et hôtel, sans savoir encore quoi acheter ni à qui.",
    "remote": "À ce stade, acheter à distance est risqué : sans repères clairs, tu t'exposes aux mauvaises surprises sur la qualité et aux arnaques.",
    "undecided": "À ce stade, ni le voyage ni l'achat à distance ne seraient rentables. La bonne nouvelle : tout ce qui manque se prépare depuis chez toi."
   }
  },
  {
   "id": "T2",
   "min": 5,
   "max": 7,
   "headline": "En bonne voie.",
   "subline": "Tu as de bonnes bases. Il reste quelques points à régler, et on peut t'aider à les régler.",
   "wa_message": "Bonjour Sama, j'ai fait le test Score de préparation : {score}/{total}. Je veux acheter {produit} en Chine ({mode}). Il me manque surtout : {manques}. Comment on corrige ça ? (Réf. {lead_id})",
   "reading": {
    "travel": "Le voyage peut devenir rentable, mais pas encore : sans régler les points ci-dessous, le billet risque de coûter plus qu'il ne rapporte.",
    "remote": "Acheter à distance est possible pour toi, à condition d'avoir quelqu'un de confiance sur place qui vérifie avant que tu paies.",
    "undecided": "Ton projet avance. Selon ta quantité et ton budget, un agent sur place peut te coûter moins cher qu'un voyage. On peut faire le calcul ensemble."
   }
  },
  {
   "id": "T3",
   "min": 8,
   "max": 10,
   "headline": "Prêt.",
   "subline": "Tu as fait le travail que la plupart des acheteurs sautent.",
   "wa_message": "Bonjour Sama, j'ai fait le test Score de préparation : {score}/{total}. Je suis prêt pour acheter {produit} en Chine ({mode}). On peut en parler pour passer à l'exécution ? (Réf. {lead_id})",
   "reading": {
    "travel": "Tu es prêt à venir. Le voyage sera rentable si chaque jour sur place est préparé : rendez-vous, usines, échantillons.",
    "remote": "Tu es prêt à acheter à distance. Il reste à bien encadrer l'exécution : contrôle avant paiement, suivi, expédition.",
    "undecided": "Ton dossier est solide. Voyage ou distance, les deux sont possibles : le choix dépend surtout de ta quantité et de ton budget."
   }
  }
 ],
 "copy": {
  "intro": {
   "bullets": [
    "2 minutes, 12 questions courtes",
    "Un score sur 10 et ce qui te manque, concrètement",
    "Ton résultat tout de suite, sans donner ton email"
   ],
   "cta": "Commencer le test",
   "resume": "Reprendre le test",
   "restart": "Recommencer à zéro",
   "note": "Tes réponses restent sur ton téléphone. Rien n'est envoyé tant que tu ne cliques pas sur WhatsApp."
  },
  "calc": "On calcule ton score…",
  "result": {
   "score_label": "Ton score",
   "missing_lead": "D'après tes réponses, il te manque surtout",
   "missing_more": "Le détail est plus bas, thème par thème.",
   "allgood": "D'après tes réponses, rien d'essentiel ne manque.",
   "dims_title": "Ton score par thème",
   "dims_intro": "Touche un point manquant pour voir quoi faire.",
   "wa_cta": "Parler de mon résultat sur WhatsApp",
   "wa_note": "Le message part déjà rempli avec ton score et ce qui te manque. Tu peux le modifier avant d'envoyer.",
   "share_cta": "Partager le test",
   "share_text": "J'ai fait le test « Score de préparation » de Sama Sourcing : es-tu prêt à acheter en Chine ? 2 minutes ici :",
   "print_cta": "Enregistrer en PDF",
   "restart": "Refaire le test"
  }
 }
};

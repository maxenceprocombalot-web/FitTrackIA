import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, R, Sp, Fs, Fw, Fonts , tapSlop } from '../../constants/theme';

const SECTIONS = [
  {
    title: '1. Responsable du traitement',
    body: "FitTrack IA est une application indépendante développée à titre personnel. Les données que tu saisis sont stockées exclusivement sur ton appareil — aucun compte utilisateur, aucun serveur, aucune base de données distante.",
  },
  {
    title: '2. Données collectées',
    body: "L'application collecte et stocke localement sur ton appareil :\n• Profil : prénom, genre, âge, taille, poids, objectif\n• Séances d'entraînement : exercices, séries, répétitions, poids utilisé\n• Nutrition : repas, aliments, quantités, calories\n• Hydratation : volume d'eau consommé par jour\n• Poids corporel : historique de pesées\n• Messages avec le coach IA (historique du chat)",
  },
  {
    title: '3. Finalité du traitement',
    body: "Les données sont utilisées uniquement pour :\n• Afficher tes statistiques personnelles (calories, macros, progression)\n• Calculer ton TDEE et tes objectifs nutritionnels\n• Alimenter le coach IA en contexte personnalisé\n• Générer tes bilans mensuels",
  },
  {
    title: '4. Partage des données avec des tiers',
    body: "Deux services tiers reçoivent des données dans des conditions strictement encadrées :\n\n— OpenAI (coach IA) : lorsque tu envoies un message au coach, les informations suivantes sont transmises à l'API OpenAI via une connexion HTTPS sécurisée : ton prénom, objectif, données physiques (âge, taille, poids), macros cibles, résumé des 7 dernières séances et repas. Ces données ne sont jamais stockées côté FitTrack IA, et leur traitement par OpenAI est soumis à la politique de confidentialité d'OpenAI (openai.com/policies/privacy-policy).\n\n— OpenFoodFacts : les termes de recherche saisis dans l'onglet Nutrition sont transmis à l'API publique OpenFoodFacts sous forme de requêtes anonymes (aucune donnée personnelle n'est transmise).\n\nAucune autre donnée n'est partagée avec des tiers. Il n'y a pas de publicité, pas d'analytique, pas de trackers.",
  },
  {
    title: '5. Durée de conservation',
    body: "Les données sont conservées sur ton appareil jusqu'à :\n• La désinstallation de l'application\n• Ou l'utilisation de la fonction « Supprimer toutes mes données » dans les paramètres",
  },
  {
    title: '6. Tes droits (RGPD)',
    body: "Conformément au Règlement Général sur la Protection des Données (RGPD), tu disposes des droits suivants :\n• Droit d'accès : toutes tes données sont visibles directement dans l'application\n• Droit de rectification : tu peux modifier ton profil à tout moment\n• Droit à l'effacement : utilise « Supprimer toutes mes données » dans Profil → Paramètres\n• Droit à la portabilité : non applicable (données locales uniquement)\n• Droit d'opposition : arrête simplement d'utiliser l'application",
  },
  {
    title: '7. Sécurité',
    body: "Toutes les communications avec des services tiers (OpenAI, OpenFoodFacts) utilisent exclusivement le protocole HTTPS. La clé API OpenAI est configurée par l'utilisateur dans ses propres variables d'environnement et n'est jamais partagée.",
  },
  {
    title: '8. Modifications',
    body: "Cette politique peut être mise à jour lors de nouvelles versions de l'application. La date de dernière mise à jour est indiquée ci-dessous.",
  },
];

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Retour"
          accessibilityRole="button"
          hitSlop={tapSlop}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Politique de confidentialité</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Dernière mise à jour : 8 juin 2026</Text>
        <Text style={styles.intro}>
          Cette politique explique quelles données FitTrack IA collecte, comment elles sont utilisées et tes droits en tant qu'utilisateur.
        </Text>
        {SECTIONS.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={18} color={Colors.green} />
          <Text style={styles.footerText}>Tes données ne quittent jamais ton appareil, sauf pour le coach IA (OpenAI) et la recherche d'aliments (OpenFoodFacts).</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: Sp.sm, padding: Sp.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: 4 },
  title: { fontSize: Fs.lg, fontFamily: Fonts.bold, color: Colors.text, flex: 1 },
  content: { padding: Sp.md, paddingBottom: 60 },
  updated: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, marginBottom: Sp.sm },
  intro: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary, lineHeight: 20, marginBottom: Sp.lg },
  section: { marginBottom: Sp.lg },
  sectionTitle: { fontSize: Fs.md, fontFamily: Fonts.bold, color: Colors.text, marginBottom: Sp.xs },
  sectionBody: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary, lineHeight: 21 },
  footer: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.green + '12', borderRadius: R, padding: Sp.md, borderWidth: 1, borderColor: Colors.green + '30', marginTop: Sp.md },
  footerText: { flex: 1, fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary, lineHeight: 20 },
});

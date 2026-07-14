import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, R, Sp, Fs, Fw, Fonts } from '../../constants/theme';

const SECTIONS = [
  {
    title: '1. Acceptation des conditions',
    body: "En utilisant FitTrack IA, tu acceptes les présentes conditions d'utilisation. Si tu n'acceptes pas ces conditions, n'utilise pas l'application.",
  },
  {
    title: '2. Description du service',
    body: "FitTrack IA est une application mobile de suivi sportif et nutritionnel. Elle permet de :\n• Enregistrer tes séances d'entraînement\n• Suivre ta nutrition et tes macronutriments\n• Consulter un coach IA propulsé par GPT-4o (OpenAI)\n• Analyser ta progression dans le temps",
  },
  {
    title: '3. Avertissement médical important',
    body: "⚠️ FitTrack IA n'est pas un dispositif médical. Les informations fournies, y compris les conseils du coach IA, sont données à titre indicatif et ne remplacent en aucun cas un avis médical, diététique ou nutritionnel professionnel.\n\nConsulte un médecin ou un professionnel de santé avant de commencer tout programme d'entraînement ou de modifier significativement ton alimentation, notamment si tu as des problèmes de santé préexistants.",
  },
  {
    title: '4. Le coach IA (GPT-4o)',
    body: "Le coach IA utilise l'API OpenAI (GPT-4o). Les réponses générées sont automatiques et basées sur les données que tu fournis. Elles ne constituent pas un suivi médical ou diététique professionnel.\n\nL'utilisation du coach IA est soumise aux conditions d'utilisation d'OpenAI. En utilisant cette fonctionnalité, tu acceptes également les conditions d'utilisation d'OpenAI (openai.com/policies/terms-of-use).",
  },
  {
    title: '5. Responsabilité de l\'utilisateur',
    body: "Tu es seul(e) responsable :\n• De l'exactitude des informations que tu saisis (poids, calories, exercices)\n• De l'interprétation des conseils du coach IA\n• Des décisions que tu prends concernant ton alimentation et ton entraînement\n• De la sécurité de ton appareil et de tes données",
  },
  {
    title: '6. Limitation de responsabilité',
    body: "Dans les limites autorisées par la loi applicable, FitTrack IA et son développeur ne peuvent être tenus responsables des dommages directs ou indirects résultant de l'utilisation ou de l'impossibilité d'utiliser l'application, y compris les dommages liés à une blessure physique, une perte de données ou un préjudice matériel.",
  },
  {
    title: '7. Propriété intellectuelle',
    body: "L'application FitTrack IA, son code source, son interface et son contenu sont la propriété exclusive du développeur. Toute reproduction, distribution ou modification sans autorisation écrite est interdite.",
  },
  {
    title: '8. Données nutritionnelles',
    body: "Les données nutritionnelles proviennent de sources reconnues (base CIQUAL de l'ANSES, OpenFoodFacts) mais peuvent contenir des imprécisions. FitTrack IA ne garantit pas l'exactitude ou l'exhaustivité de ces données.",
  },
  {
    title: '9. Modifications des conditions',
    body: "Ces conditions d'utilisation peuvent être modifiées lors de mises à jour de l'application. La version en vigueur est toujours accessible depuis les paramètres de l'application.",
  },
  {
    title: '10. Droit applicable',
    body: "Ces conditions sont régies par le droit français. En cas de litige, les tribunaux français sont compétents.",
  },
];

export default function TermsScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Retour"
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Conditions d'utilisation</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Dernière mise à jour : 8 juin 2026</Text>
        {SECTIONS.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}
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
  updated: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, marginBottom: Sp.lg },
  section: { marginBottom: Sp.lg },
  sectionTitle: { fontSize: Fs.md, fontFamily: Fonts.bold, color: Colors.text, marginBottom: Sp.xs },
  sectionBody: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary, lineHeight: 21 },
});

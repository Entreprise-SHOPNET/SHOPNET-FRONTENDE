


import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';

const questions = [
  {
    question: "Pourquoi souhaitez-vous utiliser SHOPNet ?",
    options: [
      "Acheter des produits facilement",
      "Vendre mes produits",
      "Trouver des services locaux",
      "Découvrir de nouvelles opportunités économiques"
    ]
  },
  {
    question: "Quel est votre statut actuel ?",
    options: [
      "Étudiant(e)",
      "Travailleur indépendant",
      "Propriétaire d’entreprise",
      "Sans emploi pour le moment"
    ]
  },
  {
    question: "Quel type de produits vous intéresse le plus ?",
    options: [
      "Produits électroniques",
      "Mode et accessoires",
      "Alimentation et biens de consommation",
      "Services (coiffure, réparation, transport, etc.)"
    ]
  },
  {
    question: "À quelle fréquence utilisez-vous les apps de vente/achat ?",
    options: [
      "Tous les jours",
      "Quelques fois par semaine",
      "Rarement",
      "C’est ma première fois"
    ]
  },
  {
    question: "Seriez-vous intéressé par des promotions locales ?",
    options: [
      "Oui, absolument",
      "Oui, si c’est fiable",
      "Peut-être",
      "Non, pas vraiment"
    ]
  },
  {
    question: "Quel est votre objectif principal avec SHOPNet ?",
    options: [
      "Générer des revenus",
      "Économiser de l'argent",
      "Faire connaître mes services",
      "Juste explorer par curiosité"
    ]
  }
];

export default function Questionnaire() {
  const [currentPage, setCurrentPage] = useState(0);
  const [answers, setAnswers] = useState(Array(questions.length).fill(null));

  const handleSelect = (option) => {
    const updatedAnswers = [...answers];
    updatedAnswers[currentPage] = option;
    setAnswers(updatedAnswers);
  };

  const goNext = () => {
    if (currentPage < questions.length) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const goBack = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleStart = () => {
    router.push('/(tabs)/Auth/Inscription/Chargement');
  };

  if (currentPage === questions.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Merci pour vos réponses !</Text>
        <TouchableOpacity 
          style={styles.startButton}
          onPress={handleStart}
        >
          <Text style={styles.startText}>Commencer avec SHOPNet</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentQuestion = questions[currentPage];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.question}>{currentQuestion.question}</Text>
      
      {currentQuestion.options.map((option, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.option,
            answers[currentPage] === option && styles.selected
          ]}
          onPress={() => handleSelect(option)}
        >
          <Text style={styles.optionText}>{option}</Text>
        </TouchableOpacity>
      ))}

      <View style={styles.nav}>
        {currentPage > 0 && (
          <TouchableOpacity onPress={goBack} style={styles.navButton}>
            <Text style={styles.navText}>Retour</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={goNext} style={styles.navButton}>
          <Text style={styles.navText}>
            {currentPage === questions.length - 1 ? 'Terminer' : 'Suivant'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#f2f7fb',
    justifyContent: 'center'
  },
  question: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 25,
    color: '#2B3E4F',
    lineHeight: 28
  },
  option: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#E0E0E0'
  },
  selected: {
    borderColor: '#3A526A',
    backgroundColor: '#EBF2FA'
  },
  optionText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500'
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    gap: 15
  },
  navButton: {
    backgroundColor: '#3A526A',
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 10,
    flex: 1
  },
  navText: {
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center'
  },
  startButton: {
    backgroundColor: '#2B3E4F',
    padding: 18,
    borderRadius: 14,
    marginTop: 30,
    alignSelf: 'center'
  },
  startText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600'
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2B3E4F',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 32
  }
});
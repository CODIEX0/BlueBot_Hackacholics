import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Icon wrapper component
const Icon = ({ name, size, color }: { name: string; size: number; color: string }) => {
  const IconLib = Ionicons as any;
  return <IconLib name={name} size={size} color={color} />;
};

export default function TermsConditionsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <LinearGradient
          colors={['#1E3A8A', '#0EA5E9']}
          style={styles.heroSection}
        >
          <Icon name="shield-checkmark" size={48} color="#FFFFFF" />
          <Text style={styles.heroTitle}>Your Financial Privacy Matters</Text>
          <Text style={styles.heroSubtitle}>
            BlueBot is committed to protecting your financial data and privacy
            in compliance with POPIA and South African banking regulations.
          </Text>
        </LinearGradient>

        {/* Last Updated */}
        <View style={styles.lastUpdated}>
          <Icon name="alert-circle" size={16} color="#0EA5E9" />
          <Text style={styles.lastUpdatedText}>
            Last updated: June 26, 2025
          </Text>
        </View>

        {/* Terms Sections */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="document-text" size={20} color="#1E3A8A" />
            <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          </View>
          <Text style={styles.sectionText}>
            By downloading, installing, or using the BlueBot financial assistant
            application ("App"), you agree to be bound by these Terms and
            Conditions ("Terms"). If you do not agree to these Terms, please do
            not use the App.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="document-text" size={20} color="#1E3A8A" />
            <Text style={styles.sectionTitle}>2. Service Description</Text>
          </View>
          <Text style={styles.sectionText}>
            BlueBot provides:
          </Text>
          <View style={styles.bulletPoints}>
            <Text style={styles.bulletPoint}>
              • AI-powered financial advice and insights
            </Text>
            <Text style={styles.bulletPoint}>
              • Expense tracking and receipt scanning
            </Text>
            <Text style={styles.bulletPoint}>
              • Digital wallet services for banked and unbanked users
            </Text>
            <Text style={styles.bulletPoint}>
              • Cryptocurrency wallet functionality
            </Text>
            <Text style={styles.bulletPoint}>
              • Financial education and literacy content
            </Text>
            <Text style={styles.bulletPoint}>
              • Community banking and Stokvel features
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="document-text" size={20} color="#1E3A8A" />
            <Text style={styles.sectionTitle}>3. User Responsibilities</Text>
          </View>
          <Text style={styles.sectionText}>You agree to:</Text>
          <View style={styles.bulletPoints}>
            <Text style={styles.bulletPoint}>
              • Provide accurate and complete information
            </Text>
            <Text style={styles.bulletPoint}>
              • Keep your account credentials secure
            </Text>
            <Text style={styles.bulletPoint}>
              • Use the App in compliance with South African laws
            </Text>
            <Text style={styles.bulletPoint}>
              • Not use the App for illegal activities
            </Text>
            <Text style={styles.bulletPoint}>
              • Report suspicious activities immediately
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="document-text" size={20} color="#1E3A8A" />
            <Text style={styles.sectionTitle}>4. POPIA Compliance</Text>
          </View>
          <Text style={styles.sectionText}>
            In accordance with the Protection of Personal Information Act (POPIA),
            we collect and process your personal information only:
          </Text>
          <View style={styles.bulletPoints}>
            <Text style={styles.bulletPoint}>
              • With your explicit consent
            </Text>
            <Text style={styles.bulletPoint}>
              • For legitimate financial service purposes
            </Text>
            <Text style={styles.bulletPoint}>
              • In a secure and transparent manner
            </Text>
            <Text style={styles.bulletPoint}>
              • With the right to access, correct, or delete your data
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="document-text" size={20} color="#1E3A8A" />
            <Text style={styles.sectionTitle}>5. Financial Services</Text>
          </View>
          <Text style={styles.sectionText}>
            BlueBot provides financial technology services and is not a licensed
            bank. We partner with authorized financial service providers to offer:
          </Text>
          <View style={styles.bulletPoints}>
            <Text style={styles.bulletPoint}>
              • Digital wallet services through licensed partners
            </Text>
            <Text style={styles.bulletPoint}>
              • Cryptocurrency services through authorized exchanges
            </Text>
            <Text style={styles.bulletPoint}>
              • Money transfer services through registered providers
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="document-text" size={20} color="#1E3A8A" />
            <Text style={styles.sectionTitle}>6. Security & Risk</Text>
          </View>
          <Text style={styles.sectionText}>
            While we implement industry-standard security measures, you
            acknowledge that:
          </Text>
          <View style={styles.bulletPoints}>
            <Text style={styles.bulletPoint}>
              • No system is 100% secure
            </Text>
            <Text style={styles.bulletPoint}>
              • Cryptocurrency investments carry inherent risks
            </Text>
            <Text style={styles.bulletPoint}>
              • You are responsible for securing your wallet and credentials
            </Text>
            <Text style={styles.bulletPoint}>
              • AI advice is for information purposes only
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="document-text" size={20} color="#1E3A8A" />
            <Text style={styles.sectionTitle}>7. Limitation of Liability</Text>
          </View>
          <Text style={styles.sectionText}>
            BlueBot shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages, including but not limited to
            loss of profits, data, or other intangible losses resulting from
            your use of the App.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="document-text" size={20} color="#1E3A8A" />
            <Text style={styles.sectionTitle}>8. Termination</Text>
          </View>
          <Text style={styles.sectionText}>
            We may terminate or suspend your account immediately, without prior
            notice, for conduct that we believe violates these Terms or is
            harmful to other users of the App or third parties, or for any other
            reason in our sole discretion.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="document-text" size={20} color="#1E3A8A" />
            <Text style={styles.sectionTitle}>9. Governing Law</Text>
          </View>
          <Text style={styles.sectionText}>
            These Terms shall be governed by and construed in accordance with
            the laws of South Africa. Any disputes shall be resolved in the
            competent courts of South Africa.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="document-text" size={20} color="#1E3A8A" />
            <Text style={styles.sectionTitle}>10. Contact Information</Text>
          </View>
          <Text style={styles.sectionText}>
            For questions about these Terms, please contact us:
          </Text>
          <View style={styles.contactInfo}>
            <Text style={styles.contactText}>Email: legal@bluebot.co.za</Text>
            <Text style={styles.contactText}>Phone: +27 11 123 4567</Text>
            <Text style={styles.contactText}>
              Address: 1 Simmonds Street, Johannesburg, 2001
            </Text>
          </View>
        </View>

        {/* Agreement Section */}
        <View style={styles.agreementSection}>
          <Text style={styles.agreementText}>
            By continuing to use BlueBot, you acknowledge that you have read,
            understood, and agree to be bound by these Terms and Conditions.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  content: {
    flex: 1,
  },
  heroSection: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 24,
  },
  lastUpdated: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F0F9FF',
    marginHorizontal: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  lastUpdatedText: {
    fontSize: 14,
    color: '#0EA5E9',
    fontWeight: '500',
    marginLeft: 8,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A8A',
    marginLeft: 8,
  },
  sectionText: {
    fontSize: 16,
    color: '#334155',
    lineHeight: 24,
    marginBottom: 12,
  },
  bulletPoints: {
    marginLeft: 16,
  },
  bulletPoint: {
    fontSize: 16,
    color: '#334155',
    lineHeight: 24,
    marginBottom: 8,
  },
  contactInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactText: {
    fontSize: 16,
    color: '#1E3A8A',
    marginBottom: 8,
    fontWeight: '500',
  },
  agreementSection: {
    backgroundColor: '#FEF3C7',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  agreementText: {
    fontSize: 16,
    color: '#92400E',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 24,
  },
});


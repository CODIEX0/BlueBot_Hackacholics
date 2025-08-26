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

export default function PrivacyPolicyScreen() {
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <LinearGradient
          colors={['#10B981', '#059669']}
          style={styles.heroSection}
        >
          <Icon name="shield-checkmark" size={48} color="#FFFFFF" />
          <Text style={styles.heroTitle}>Your Privacy is Protected</Text>
          <Text style={styles.heroSubtitle}>
            POPIA-compliant data protection for all South African users
          </Text>
        </LinearGradient>

        {/* POPIA Notice */}
        <View style={styles.popiaNotice}>
          <Icon name="warning" size={20} color="#F59E0B" />
          <View style={styles.popiaText}>
            <Text style={styles.popiaTitle}>POPIA Compliance Notice</Text>
            <Text style={styles.popiaSubtitle}>
              This policy complies with the Protection of Personal Information Act
              (Act 4 of 2013) and your rights as a South African citizen.
            </Text>
          </View>
        </View>

        {/* Data Collection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="server" size={20} color="#1E3A8A" />
            <Text style={styles.sectionTitle}>Information We Collect</Text>
          </View>
          <Text style={styles.sectionText}>
            We collect only the information necessary to provide you with
            financial services:
          </Text>
          <View style={styles.dataTypes}>
            <View style={styles.dataTypeCard}>
              <Text style={styles.dataTypeTitle}>Personal Information</Text>
              <Text style={styles.dataTypeText}>
                • Full name and identity details
                {'\n'}• Phone number and email address
                {'\n'}• Residential address
                {'\n'}• Date of birth for age verification
              </Text>
            </View>
            <View style={styles.dataTypeCard}>
              <Text style={styles.dataTypeTitle}>Financial Information</Text>
              <Text style={styles.dataTypeText}>
                • Transaction history and patterns
                {'\n'}• Account balances and spending data
                {'\n'}• Income and expense categories
                {'\n'}• Investment preferences and goals
              </Text>
            </View>
            <View style={styles.dataTypeCard}>
              <Text style={styles.dataTypeTitle}>Technical Information</Text>
              <Text style={styles.dataTypeText}>
                • Device information and identifiers
                {'\n'}• App usage patterns and preferences
                {'\n'}• Location data (with consent)
                {'\n'}• Biometric data for authentication
              </Text>
            </View>
          </View>
        </View>

        {/* How We Use Data */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="eye" size={20} color="#1E3A8A" />
            <Text style={styles.sectionTitle}>How We Use Your Information</Text>
          </View>
          <Text style={styles.sectionText}>
            Your information is used exclusively for:
          </Text>
          <View style={styles.bulletPoints}>
            <Text style={styles.bulletPoint}>
              • Providing personalized financial advice through BlueBot AI
            </Text>
            <Text style={styles.bulletPoint}>
              • Processing transactions and maintaining wallet security
            </Text>
            <Text style={styles.bulletPoint}>
              • Analyzing spending patterns to offer insights
            </Text>
            <Text style={styles.bulletPoint}>
              • Preventing fraud and ensuring account security
            </Text>
            <Text style={styles.bulletPoint}>
              • Complying with South African financial regulations
            </Text>
            <Text style={styles.bulletPoint}>
              • Improving app functionality and user experience
            </Text>
          </View>
        </View>

        {/* Data Security */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="lock-closed" size={20} color="#1E3A8A" />
            <Text style={styles.sectionTitle}>Data Security</Text>
          </View>
          <Text style={styles.sectionText}>
            We implement industry-leading security measures:
          </Text>
          <View style={styles.securityGrid}>
            <View style={styles.securityItem}>
              <Text style={styles.securityTitle}>Encryption</Text>
              <Text style={styles.securityText}>
                AES-256 encryption for all sensitive data
              </Text>
            </View>
            <View style={styles.securityItem}>
              <Text style={styles.securityTitle}>Biometric Auth</Text>
              <Text style={styles.securityText}>
                Fingerprint and face recognition security
              </Text>
            </View>
            <View style={styles.securityItem}>
              <Text style={styles.securityTitle}>Secure Storage</Text>
              <Text style={styles.securityText}>
                Local encryption with secure key management
              </Text>
            </View>
            <View style={styles.securityItem}>
              <Text style={styles.securityTitle}>Regular Audits</Text>
              <Text style={styles.securityText}>
                Monthly security assessments and updates
              </Text>
            </View>
          </View>
        </View>

        {/* Your Rights */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="shield-checkmark" size={20} color="#1E3A8A" />
            <Text style={styles.sectionTitle}>Your POPIA Rights</Text>
          </View>
          <Text style={styles.sectionText}>
            Under POPIA, you have the right to:
          </Text>
          <View style={styles.rightsGrid}>
            <View style={styles.rightItem}>
              <Text style={styles.rightTitle}>Access</Text>
              <Text style={styles.rightText}>
                View all personal information we hold about you
              </Text>
            </View>
            <View style={styles.rightItem}>
              <Text style={styles.rightTitle}>Correction</Text>
              <Text style={styles.rightText}>
                Update or correct inaccurate information
              </Text>
            </View>
            <View style={styles.rightItem}>
              <Text style={styles.rightTitle}>Deletion</Text>
              <Text style={styles.rightText}>
                Request deletion of your personal data
              </Text>
            </View>
            <View style={styles.rightItem}>
              <Text style={styles.rightTitle}>Portability</Text>
              <Text style={styles.rightText}>
                Export your data in a readable format
              </Text>
            </View>
            <View style={styles.rightItem}>
              <Text style={styles.rightTitle}>Objection</Text>
              <Text style={styles.rightText}>
                Object to certain uses of your information
              </Text>
            </View>
            <View style={styles.rightItem}>
              <Text style={styles.rightTitle}>Complaint</Text>
              <Text style={styles.rightText}>
                Lodge complaints with the Information Regulator
              </Text>
            </View>
          </View>
        </View>

        {/* Third Parties */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="server" size={20} color="#1E3A8A" />
            <Text style={styles.sectionTitle}>Third-Party Partners</Text>
          </View>
          <Text style={styles.sectionText}>
            We work with trusted partners to provide services:
          </Text>
          <View style={styles.partnerCard}>
            <Text style={styles.partnerTitle}>Banking Partners</Text>
            <Text style={styles.partnerText}>
              Licensed South African banks for account services and payments
            </Text>
          </View>
          <View style={styles.partnerCard}>
            <Text style={styles.partnerTitle}>Identity Verification</Text>
            <Text style={styles.partnerText}>
              Authorized KYC providers for identity verification
            </Text>
          </View>
          <View style={styles.partnerCard}>
            <Text style={styles.partnerTitle}>Cloud Services</Text>
            <Text style={styles.partnerText}>
              Enterprise-grade cloud providers with South African data residency
            </Text>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="warning" size={20} color="#1E3A8A" />
            <Text style={styles.sectionTitle}>Contact Our Privacy Officer</Text>
          </View>
          <View style={styles.contactCard}>
            <Text style={styles.contactTitle}>Data Protection Officer</Text>
            <Text style={styles.contactText}>Email: privacy@bluebot.co.za</Text>
            <Text style={styles.contactText}>Phone: +27 11 123 4567</Text>
            <Text style={styles.contactText}>
              Address: 1 Simmonds Street, Johannesburg, 2001
            </Text>
          </View>
          <View style={styles.contactCard}>
            <Text style={styles.contactTitle}>Information Regulator</Text>
            <Text style={styles.contactText}>
              If you're not satisfied with our response, you can contact:
            </Text>
            <Text style={styles.contactText}>Email: inforeg@justice.gov.za</Text>
            <Text style={styles.contactText}>Phone: +27 12 406 4818</Text>
          </View>
        </View>

        {/* Consent Button */}
        <View style={styles.consentSection}>
          <Text style={styles.consentText}>
            By continuing to use BlueBot, you consent to the collection and
            processing of your personal information as described in this privacy
            policy.
          </Text>
          <TouchableOpacity
            style={styles.consentButton}
            onPress={() => router.replace('/(auth)/register')}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.consentButtonGradient}
            >
              <Text style={styles.consentButtonText}>I Agree & Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
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
  popiaNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  popiaText: {
    flex: 1,
    marginLeft: 12,
  },
  popiaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  popiaSubtitle: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
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
    marginBottom: 16,
  },
  dataTypes: {
    gap: 12,
  },
  dataTypeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dataTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  dataTypeText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  bulletPoints: {
    gap: 8,
  },
  bulletPoint: {
    fontSize: 16,
    color: '#334155',
    lineHeight: 24,
  },
  securityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  securityItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: 150,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  securityText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  rightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  rightItem: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: 150,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  rightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#047857',
    marginBottom: 4,
  },
  rightText: {
    fontSize: 12,
    color: '#065F46',
    lineHeight: 16,
  },
  partnerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  partnerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  partnerText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 4,
    lineHeight: 20,
  },
  consentSection: {
    backgroundColor: '#F0FDF4',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  consentText: {
    fontSize: 16,
    color: '#065F46',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  consentButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  consentButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  consentButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});


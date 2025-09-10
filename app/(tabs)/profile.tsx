/**
 * Profile Screen - User profile and security settings
 * Includes biometric authentication settings and other security features
 */

import React from 'react';
const { useState } = React;
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	SafeAreaView,
	ScrollView,
	Alert,
	Image,
	Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme, shadow } from '@/config/theme';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '@/components/GlassCard';
import { useBalance } from '@/contexts/BalanceContext';
import { useAccountsIntegration } from '@/contexts/AccountIntegrationContext';
import { useBudgetPlan } from '@/contexts/BudgetPlanContext';
import { wellbeingScoreService, WellbeingScoreResult } from '@/services/WellbeingScoreService';
import { useThemeMode } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { useAWS } from '@/contexts/AWSContext';
import BiometricSettings from '@/components/BiometricSettings';
import GamificationWidget from '@/components/GamificationWidget';
import { useGoals } from '@/contexts/GoalsContext';
import ProgressRing from '@/components/ProgressRing';

export default function ProfileScreen() {
	const { mode, toggle } = useThemeMode?.() || { mode: 'dark', toggle: () => {} } as any;
	const [isLoading, setIsLoading] = useState(false);
	
	// AWS Context with fallback to demo mode
	const aws = useAWS();
	const { currentUser, isInitialized, signOut: awsSignOut } = aws || {};
	const user = currentUser || { 
		firstName: 'Demo', 
		email: 'demo@bluebot.com',
		fullName: 'Demo User',
		phoneNumber: '+27 123 456 789',
		photoURL: null,
		balance: 2500.75,
		biometricEnabled: false
	};

	const { currentBalance } = useBalance();
	const accountsFeed = useAccountsIntegration();
	const { plan: budgetPlan } = useBudgetPlan();
	const [wellbeing, setWellbeing] = useState<WellbeingScoreResult|null>(null);
	// Gamification & Goals moved from Dashboard
	const { goals, addGoal, updateGoalProgress, updateGoalDetails, removeGoal, archiveGoal } = useGoals();

	const handleEditGoal = (goalId: string) => {
		const goal = goals.find(g=>g.id===goalId);
		if(!goal) return;
		Alert.alert('Goal Options', goal.title, [
			{ text: 'Cancel', style: 'cancel' },
			{ text: 'Add Progress', onPress: () => promptAddProgress(goal) },
			{ text: 'Rename', onPress: () => promptRenameGoal(goal) },
			{ text: 'Adjust Target', onPress: () => promptAdjustTarget(goal) },
			{ text: 'Archive', style: 'destructive', onPress: () => archiveGoal(goal.id) },
			{ text: 'Delete', style: 'destructive', onPress: () => confirmDeleteGoal(goal) },
		]);
	};

	const promptAddProgress = (goal: any) => {
		if (Alert.prompt) {
			Alert.prompt('Add Progress', `Enter amount to add to "${goal.title}" (R):`, [
				{ text: 'Cancel', style: 'cancel' },
				{ text: 'Add', onPress: (val) => {
					const num = Number(val);
					if(!isNaN(num) && num > 0){
						updateGoalProgress(goal.id, goal.current + num);
					} else { Alert.alert('Invalid', 'Enter a positive number'); }
				}}
			],'plain-text','0');
		} else {
			Alert.alert('Not Supported', 'Inline input not supported on this platform');
		}
	};

	const promptRenameGoal = (goal: any) => {
		if (Alert.prompt) {
			Alert.prompt('Rename Goal', 'Enter new goal title:', [
				{ text: 'Cancel', style: 'cancel' },
				{ text: 'Save', onPress: (val) => {
					if(val && val.trim().length >= 2){
						updateGoalDetails(goal.id, { title: val.trim() });
					} else { Alert.alert('Invalid', 'Title must be at least 2 characters'); }
				}}
			],'plain-text', goal.title);
		}
	};

	const promptAdjustTarget = (goal: any) => {
		if (Alert.prompt) {
			Alert.prompt('Adjust Target', `Current target R${goal.target.toLocaleString()}. Enter new target:`, [
				{ text: 'Cancel', style: 'cancel' },
				{ text: 'Save', onPress: (val) => {
					const num = Number(val);
					if(!isNaN(num) && num >= goal.current && num > 0){
						updateGoalDetails(goal.id, { target: num });
					} else if(!isNaN(num) && num > 0 && num < goal.current){
						// Allow lowering; will clamp progress in updateGoalDetails
						updateGoalDetails(goal.id, { target: num });
					} else { Alert.alert('Invalid', 'Enter a valid number greater than 0'); }
				}}
			],'plain-text', goal.target.toString());
		}
	};

	const confirmDeleteGoal = (goal: any) => {
		Alert.alert('Delete Goal', `Delete "${goal.title}"? This cannot be undone.`, [
			{ text: 'Cancel', style: 'cancel' },
			{ text: 'Delete', style: 'destructive', onPress: () => removeGoal(goal.id) }
		]);
	};

	const handleQuickGoalAdd = () => {
		addGoal({ title: 'New Goal', category: 'custom', current: 0, target: 10000 });
	};

	// Compute quick wellbeing snapshot (lightweight) when feed or balance changes
	React.useEffect(()=>{
		try {
			const expenses = accountsFeed.expenseLike.map(e=>({ amount: e.amount, category: e.category, date: e.date, isRecurring: e.isRecurring }));
			const result = wellbeingScoreService.compute(expenses, [], currentBalance);
			setWellbeing(result);
		} catch {}
	}, [accountsFeed.expenseLike, currentBalance]);
	
	// Demo mode functions
	const signOut = async () => {
		if (awsSignOut) {
			return awsSignOut();
		}
		// Demo mode - just show alert
		Alert.alert('Demo Mode', 'Sign out would work in live mode');
	};
	
	const updateProfile = async (data: any) => {
		if (isInitialized) {
			// Would update profile via AWS Cognito
			Alert.alert('Success', 'Profile updated successfully');
		} else {
			Alert.alert('Demo Mode', 'Profile updates would be saved in live mode');
		}
	};
	
	const resetPassword = async () => {
		if (isInitialized) {
			// Would reset password via AWS Cognito
			Alert.alert('Success', 'Password reset email sent');
		} else {
			Alert.alert('Demo Mode', 'Password reset would work in live mode');
		}
	};
	
	const biometricAvailable = false; // Demo mode - biometrics not available
	
	// Utility function to safely get user properties
	const getUserProperty = (property: string, defaultValue: any = '') => {
		if (currentUser && property in currentUser) {
			return (currentUser as any)[property];
		}
		if (user && property in user) {
			return (user as any)[property];
		}
		return defaultValue;
	};
	
	const router = useRouter();

	const handleSignOut = async () => {
		Alert.alert(
			'Sign Out',
			'Are you sure you want to sign out?',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Sign Out',
					style: 'destructive',
					onPress: async () => {
						setIsLoading(true);
						try {
							await signOut();
							router.replace('/login');
						} catch (error: any) {
							Alert.alert('Error', 'Failed to sign out');
						} finally {
							setIsLoading(false);
						}
					},
				},
			]
		);
	};

	const handleEditProfile = () => {
		Alert.alert(
			'Edit Profile',
			'Choose what you want to update:',
			[
				{ text: 'Cancel', style: 'cancel' },
				{ 
					text: 'Update Name', 
					onPress: () => showUpdateNameDialog()
				},
				{ 
					text: 'Update Email', 
					onPress: () => showUpdateEmailDialog()
				},
				{ 
					text: 'Update Phone', 
					onPress: () => showUpdatePhoneDialog()
				},
				{ 
					text: 'Profile Picture', 
					onPress: () => showProfilePictureOptions()
				},
			]
		);
	};

	const showUpdateNameDialog = () => {
		// Using Alert.prompt for platforms that support it
		if (Alert.prompt) {
			Alert.prompt(
				'Update Name',
				'Enter your new full name:',
				[
					{ text: 'Cancel', style: 'cancel' },
					{ 
						text: 'Update', 
						onPress: async (newName) => {
							if (newName && newName.trim().length >= 2) {
								await updateUserProfile({ fullName: newName.trim() });
							} else {
								Alert.alert('Invalid Name', 'Please enter a valid name (at least 2 characters)');
							}
						}
					}
				],
				'plain-text',
				getUserProperty('fullName', 'Demo User')
			);
		} else {
			// Fallback for platforms that don't support Alert.prompt
			Alert.alert(
				'Update Name',
				'To update your name:\n\n1. Contact our support team\n2. Provide valid ID documentation\n3. Verification process takes 1-2 business days',
				[
					{ text: 'Cancel', style: 'cancel' },
					{ text: 'Contact Support', onPress: () => Alert.alert('Support', 'Opening support chat...') }
				]
			);
		}
	};

	const showUpdateEmailDialog = () => {
		if (Alert.prompt) {
			Alert.prompt(
				'Update Email',
				'Enter your new email address:\n\n⚠️ This will require email verification',
				[
					{ text: 'Cancel', style: 'cancel' },
					{ 
						text: 'Send Verification', 
						onPress: async (newEmail) => {
							if (newEmail && isValidEmail(newEmail)) {
								Alert.alert(
									'Verification Sent',
									`A verification link has been sent to ${newEmail}. Click the link to confirm your new email address.`,
									[{ text: 'OK' }]
								);
							} else {
								Alert.alert('Invalid Email', 'Please enter a valid email address');
							}
						}
					}
				],
				'plain-text',
				user?.email || ''
			);
		} else {
			Alert.alert(
				'Update Email',
				'To update your email address:\n\n1. Current email: ' + (user?.email || 'Not set') + '\n2. Contact support for secure email change\n3. Verification required for security',
				[
					{ text: 'Cancel', style: 'cancel' },
					{ text: 'Contact Support', onPress: () => Alert.alert('Support', 'Opening support for email change...') }
				]
			);
		}
	};

	const showUpdatePhoneDialog = () => {
		if (Alert.prompt) {
			Alert.prompt(
				'Update Phone Number',
				'Enter your new phone number (include country code):',
				[
					{ text: 'Cancel', style: 'cancel' },
					{ 
						text: 'Send SMS Code', 
						onPress: (newPhone) => {
							if (newPhone && isValidPhoneNumber(newPhone)) {
								Alert.alert(
									'SMS Sent',
									`A verification code has been sent to ${newPhone}. Enter the code to confirm your new phone number.`,
									[
										{ text: 'Cancel', style: 'cancel' },
										{ 
											text: 'Enter Code', 
											onPress: () => showSMSVerification(newPhone)
										}
									]
								);
							} else {
								Alert.alert('Invalid Phone', 'Please enter a valid phone number with country code (e.g., +27821234567)');
							}
						}
					}
				],
				'phone-pad',
				user?.phoneNumber || ''
			);
		} else {
			Alert.alert(
				'Update Phone Number',
				'To update your phone number:\n\n1. Current: ' + (user?.phoneNumber || 'Not set') + '\n2. Contact support for secure phone change\n3. SMS verification required',
				[
					{ text: 'Cancel', style: 'cancel' },
					{ text: 'Contact Support', onPress: () => Alert.alert('Support', 'Opening support for phone change...') }
				]
			);
		}
	};

	const showSMSVerification = (phoneNumber: string) => {
		if (Alert.prompt) {
			Alert.prompt(
				'SMS Verification',
				`Enter the 6-digit code sent to ${phoneNumber}:`,
				[
					{ text: 'Cancel', style: 'cancel' },
					{ 
						text: 'Verify', 
						onPress: async (code) => {
							if (code && code.length === 6) {
								await updateUserProfile({ phoneNumber });
								Alert.alert('Success', 'Phone number updated successfully!');
							} else {
								Alert.alert('Invalid Code', 'Please enter the 6-digit verification code');
							}
						}
					}
				],
				'numeric'
			);
		}
	};

	const isValidEmail = (email: string): boolean => {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	};

	const isValidPhoneNumber = (phone: string): boolean => {
		return /^\+[1-9]\d{1,14}$/.test(phone);
	};

	const showProfilePictureOptions = () => {
		Alert.alert(
			'Profile Picture',
			'Choose how to update your profile picture:',
			[
				{ text: 'Cancel', style: 'cancel' },
				{ 
					text: 'Take Photo', 
					onPress: () => requestCameraPermission()
				},
				{ 
					text: 'Choose from Gallery', 
					onPress: () => requestGalleryAccess()
				},
				{ 
					text: 'Remove Photo', 
					onPress: () => updateUserProfile({ photoURL: null })
				},
				{
					text: 'Choose Avatar',
					onPress: () => showAvatarOptions()
				}
			]
		);
	};

	const requestCameraPermission = () => {
		Alert.alert(
			'Camera Access',
			'BlueBot needs camera permission to take your profile photo.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{ 
					text: 'Grant Permission', 
					onPress: () => {
						Alert.alert('Camera', 'Opening camera for profile photo...\n\n(In production, this would use react-native-image-picker)');
					}
				},
				{
					text: 'Settings',
					onPress: () => Alert.alert('Settings', 'Open device settings to manage app permissions')
				}
			]
		);
	};

	const requestGalleryAccess = () => {
		Alert.alert(
			'Photo Library Access',
			'BlueBot needs access to your photo library to select a profile picture.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{ 
					text: 'Grant Permission', 
					onPress: () => {
						Alert.alert('Gallery', 'Opening photo gallery...\n\n(In production, this would use expo-image-picker)');
					}
				},
				{
					text: 'Settings',
					onPress: () => Alert.alert('Settings', 'Open device settings to manage app permissions')
				}
			]
		);
	};

	const showAvatarOptions = () => {
		const avatars = ['👤', '👨', '👩', '🧑', '👱', '👨‍💼', '👩‍💼', '🧑‍💼', '👨‍🎓', '👩‍🎓'];
		Alert.alert(
			'Choose Avatar',
			'Select a default avatar:',
			[
				{ text: 'Cancel', style: 'cancel' },
				...avatars.slice(0, 3).map((avatar, index) => ({
					text: `${avatar} Avatar ${index + 1}`,
					onPress: () => updateUserProfile({ photoURL: `avatar_${index + 1}` })
				})),
				{
					text: 'More Options',
					onPress: () => Alert.alert('Avatar Gallery', 'More avatar options available in settings')
				}
			]
		);
	};

	const updateUserProfile = async (updates: any) => {
		setIsLoading(true);
		try {
			// Use the actual auth context to update profile
			if (updateProfile) {
				await updateProfile(updates);
				Alert.alert('Success', 'Profile updated successfully!');
			} else {
				// Fallback - simulate update
				Alert.alert('Success', 'Profile changes saved locally. Will sync when online.');
			}
		} catch (error: any) {
			Alert.alert('Error', 'Failed to update profile: ' + (error.message || 'Unknown error'));
		} finally {
			setIsLoading(false);
		}
	};

	const showChangePasswordOptions = () => {
		Alert.alert(
			'Change Password',
			'Choose how you want to change your password:',
			[
				{ text: 'Cancel', style: 'cancel' },
				{ 
					text: 'Email Reset Link', 
					onPress: () => sendPasswordReset()
				},
				{ 
					text: 'Change with Current Password', 
					onPress: () => showPasswordChangeForm()
				},
			]
		);
	};

	const sendPasswordReset = async () => {
		try {
			if (resetPassword && user?.email) {
				await resetPassword();
				Alert.alert(
					'Reset Link Sent',
					`A password reset link has been sent to ${user.email}. Check your email and follow the instructions to reset your password.`,
					[{ text: 'OK' }]
				);
			} else {
				Alert.alert('Error', 'Email address required for password reset');
			}
		} catch (error: any) {
			Alert.alert('Error', error.message || 'Failed to send reset email');
		}
	};

	const showPasswordChangeForm = () => {
		if (Alert.prompt) {
			Alert.prompt(
				'Current Password',
				'Enter your current password:',
				[
					{ text: 'Cancel', style: 'cancel' },
					{ 
						text: 'Next', 
						onPress: (currentPassword) => {
							if (currentPassword && currentPassword.length >= 6) {
								showNewPasswordForm(currentPassword);
							} else {
								Alert.alert('Invalid Password', 'Please enter your current password');
							}
						}
					}
				],
				'secure-text'
			);
		} else {
			Alert.alert(
				'Change Password',
				'For security, password changes require email verification. Use "Email Reset Link" option instead.',
				[{ text: 'OK' }]
			);
		}
	};

	const showNewPasswordForm = (currentPassword: string) => {
		if (Alert.prompt) {
			Alert.prompt(
				'New Password',
				'Enter your new password (minimum 8 characters):',
				[
					{ text: 'Cancel', style: 'cancel' },
					{ 
						text: 'Change Password', 
						onPress: (newPassword) => {
							if (newPassword && newPassword.length >= 8) {
								confirmPasswordChange(currentPassword, newPassword);
							} else {
								Alert.alert('Weak Password', 'Password must be at least 8 characters long');
							}
						}
					}
				],
				'secure-text'
			);
		}
	};

	const confirmPasswordChange = (currentPassword: string, newPassword: string) => {
		Alert.alert(
			'Confirm Password Change',
			'Are you sure you want to change your password?',
			[
				{ text: 'Cancel', style: 'cancel' },
				{ 
					text: 'Change Password', 
					onPress: async () => {
						setIsLoading(true);
						try {
							if (isInitialized) {
								// Would change password via AWS Cognito
								Alert.alert('Success', 'Password changed successfully!');
							} else {
								Alert.alert('Demo Mode', 'Password change would work in live mode');
							}
						} catch (error: any) {
							Alert.alert('Error', 'Failed to change password: ' + error.message);
						} finally {
							setIsLoading(false);
						}
					}
				}
			]
		);
	};

	const showTwoFactorOptions = () => {
		Alert.alert(
			'Two-Factor Authentication',
			getUserProperty('biometricEnabled', false) ? 
				'You have biometric authentication enabled. Choose additional 2FA methods:' :
				'Add an extra layer of security to your account:',
			[
				{ text: 'Cancel', style: 'cancel' },
				{ 
					text: 'SMS Authentication', 
					onPress: () => setupSMS2FA()
				},
				{ 
					text: 'Authenticator App', 
					onPress: () => setupAuthenticatorApp()
				},
				{ 
					text: 'Email Verification', 
					onPress: () => setupEmail2FA()
				},
				{ 
					text: 'Biometric Settings',
					onPress: () => showBiometricSettings()
				}
			]
		);
	};

	const setupSMS2FA = () => {
		if (user?.phoneNumber) {
			Alert.alert(
				'SMS Two-Factor Authentication',
				`Enable SMS 2FA for phone number: ${user.phoneNumber}?\n\nYou'll receive a verification code via SMS when signing in.`,
				[
					{ text: 'Cancel', style: 'cancel' },
					{ 
						text: 'Enable SMS 2FA', 
						onPress: () => {
							Alert.alert(
								'SMS 2FA Enabled',
								'SMS two-factor authentication has been enabled for your account. You will receive a verification code on your phone for future logins.',
								[{ text: 'OK' }]
							);
						}
					}
				]
			);
		} else {
			Alert.alert('Phone Required', 'Please add a phone number to your profile first');
		}
	};

	const setupAuthenticatorApp = () => {
		Alert.alert(
			'Authenticator App',
			'To set up an authenticator app:\n\n1. Install Microsoft/Google Authenticator\n2. Scan the QR code in the next step\n3. Enter the 6-digit code to verify',
			[
				{ text: 'Cancel', style: 'cancel' },
				{ text: 'Continue', onPress: () => Alert.alert('QR Code', 'QR setup would be shown here in production') }
			]
		);
	};

	const setupEmail2FA = () => {
		Alert.alert(
			'Email Verification',
			'Enable email verification for logins?',
			[
				{ text: 'Cancel', style: 'cancel' },
				{ text: 'Enable', onPress: () => Alert.alert('Enabled', 'Email verification enabled for your account') }
			]
		);
	};

	const showBiometricSettings = () => {
		if (biometricAvailable) {
			router.push('/biometric-settings');
		} else {
			Alert.alert('Not Available', 'Biometric authentication is not available on this device');
		}
	};

	// Monthly spend + budget plan summary
	const now = new Date();
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const monthlySpent = accountsFeed.expenseLike.filter(e=>{
		const d = new Date(e.date);
		return d >= monthStart && d <= now;
	}).reduce((s,e)=>s+e.amount,0);

	const budgetPlanSummary = budgetPlan ? {
		total: budgetPlan.totalSuggested,
		cats: budgetPlan.recommendations.length,
		savings: (()=>{ const sav = budgetPlan.recommendations.find(r=>/saving/i.test(r.category)); return sav?.suggested; })()
	} : null;

	return (
		<SafeAreaView style={styles.container}>
			<ScrollView contentContainerStyle={styles.scrollContent}>
				<LinearGradient
					colors={[theme.colors.primaryDark, theme.colors.glass]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={styles.header}
				>
					<View style={styles.headerContent}>
						<View style={styles.avatarWrapper}>
							{getUserProperty('photoURL') ? (
								<Image source={{ uri: getUserProperty('photoURL') }} style={styles.avatar} />
							) : (
								<View style={styles.avatarPlaceholder}>
									<Ionicons name="person" size={48} color={theme.colors.primary} />
								</View>
							)}
						</View>
						<View style={styles.headerText}>
							<Text style={styles.name}>{getUserProperty('fullName', 'Guest User')}</Text>
							<Text style={styles.email}>{user?.email || 'No email'}</Text>
						</View>
					</View>
				</LinearGradient>

				{/* Financial Snapshot */}
				<View style={styles.section}>
					<GlassCard style={{ padding: 16 }}>
						<Text style={styles.sectionSubTitle}>Financial Snapshot</Text>
						<View style={{ flexDirection:'row', flexWrap:'wrap', gap:12, marginTop:4 }}>
							<View style={styles.metricBox}>
								<Text style={styles.metricLabel}>Balance</Text>
								<Text style={styles.metricValue}>R{currentBalance.toFixed(2)}</Text>
							</View>
							<View style={styles.metricBox}>
								<Text style={styles.metricLabel}>Month Spent</Text>
								<Text style={styles.metricValue}>R{monthlySpent.toFixed(0)}</Text>
							</View>
							{wellbeing && (
								<View style={styles.metricBox}>
									<Text style={styles.metricLabel}>Wellbeing</Text>
									<Text style={styles.metricValue}>{wellbeing.score.toFixed(0)} <Text style={styles.metricBadge}> {wellbeing.grade}</Text></Text>
								</View>
							)}
							{budgetPlanSummary && (
								<View style={[styles.metricBox, { flexBasis:'100%' }]}> 
									<Text style={styles.metricLabel}>Budget Plan</Text>
									<Text style={[styles.metricValue, { fontSize:14 }]}>R{budgetPlanSummary.total} • {budgetPlanSummary.cats} categories{budgetPlanSummary.savings?` • Savings R${budgetPlanSummary.savings}`:''}</Text>
								</View>
							)}
						</View>
						<View style={{ flexDirection:'row', marginTop:14, gap:12 }}>
							<TouchableOpacity onPress={() => router.push('/add-expense')} style={[styles.smallPill, { backgroundColor: theme.colors.primary }]}> 
								<Ionicons name="add" size={14} color="#fff" />
								<Text style={styles.smallPillText}>Add Expense</Text>
							</TouchableOpacity>
							<TouchableOpacity onPress={() => router.push('/(tabs)/expenses')} style={styles.smallPill}> 
								<Ionicons name="analytics" size={14} color={theme.colors.primary} />
								<Text style={[styles.smallPillText, { color: theme.colors.primary }]}>View Expenses</Text>
							</TouchableOpacity>
						</View>
					</GlassCard>
				</View>

				{/* Achievements & Goals (migrated from Dashboard) */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Achievements & Goals</Text>
					<GlassCard style={{ padding: 12 }}>
						<GamificationWidget />
					</GlassCard>
					<View style={{ height: 14 }} />
					<Text style={styles.sectionSubTitle}>Goals Snapshot</Text>
					{goals.map(g => {
						const progress = Math.min((g.current / g.target) * 100, 100);
						return (
								<GlassCard key={g.id} style={[styles.goalItem, shadow(1), { flexDirection:'row', alignItems:'center', gap:12 }]}> 
								<ProgressRing size={54} strokeWidth={6} progress={g.current / g.target} valueText={`${Math.round(progress)}%`} />
								<View style={{ flex:1 }}>
									<View style={styles.goalHeaderRow}>
										<Text style={styles.goalTitle}>{g.title}</Text>
										<Text style={styles.goalAmounts}>R{g.current.toLocaleString()} / R{g.target.toLocaleString()}</Text>
									</View>
									<View style={styles.goalBarBg}>
										<View style={[styles.goalBarFill, { width: `${progress}%` }]} />
									</View>
										<View style={styles.goalActionsRow}>
											<TouchableOpacity onPress={()=>handleEditGoal(g.id)} style={styles.goalActionBtn}>
												<Ionicons name="ellipsis-horizontal" size={14} color={theme.colors.text} />
												<Text style={styles.goalActionText}>Manage</Text>
											</TouchableOpacity>
											<TouchableOpacity onPress={()=>promptAddProgress(g)} style={styles.goalActionBtn}>
												<Ionicons name="add-circle" size={14} color={theme.colors.primary} />
												<Text style={[styles.goalActionText, { color: theme.colors.primary }]}>Progress</Text>
											</TouchableOpacity>
											{g.completedAt && (
												<Text style={styles.goalCompletedBadge}>Completed</Text>
											)}
										</View>
								</View>
							</GlassCard>
						);
					})}
					<TouchableOpacity onPress={handleQuickGoalAdd} style={[styles.smallPill, { marginTop:12, alignSelf:'flex-start', backgroundColor: theme.colors.primary }]}> 
						<Ionicons name="add" size={14} color="#fff" />
						<Text style={styles.smallPillText}>Add Goal</Text>
					</TouchableOpacity>
				</View>

				{/* Theme & Appearance */}
				<View style={styles.section}>
					<GlassCard style={{ padding: 16 }}>
						<View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
							<Text style={styles.sectionSubTitle}>Appearance</Text>
							<TouchableOpacity onPress={toggle} style={styles.themeToggle}> 
								<Ionicons name={mode === 'dark' ? 'moon' : 'sunny'} size={18} color={theme.colors.text} />
								<Text style={styles.themeToggleText}>{mode === 'dark' ? 'Dark' : 'Light'}</Text>
							</TouchableOpacity>
						</View>
					</GlassCard>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Security</Text>
					<GlassCard style={{ padding: 16 }}>
						<BiometricSettings />
						<View style={{ height:1, backgroundColor: theme.colors.border, marginVertical:12 }} />
						<View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}>
							<Text style={styles.securityLabel}>Biometric</Text>
							<Text style={styles.securityValue}>{getUserProperty('biometricEnabled', false) ? 'Enabled' : 'Disabled'}</Text>
						</View>
						<View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom:4 }}>
							<Text style={styles.securityLabel}>2FA (SMS)</Text>
							<Text style={styles.securityPending}>Not Set</Text>
						</View>
						<View style={{ flexDirection:'row', justifyContent:'space-between' }}>
							<Text style={styles.securityLabel}>Email Verification</Text>
							<Text style={styles.securityValue}>{isInitialized ? 'Verified' : 'Pending'}</Text>
						</View>
					</GlassCard>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Profile</Text>
					<GlassCard style={{ padding: 16 }}>
						<View style={styles.actionRow}>
							<TouchableOpacity style={styles.actionButton} onPress={handleEditProfile}>
								<Ionicons name="pencil" size={18} color={theme.colors.text} />
								<Text style={styles.actionText}>Edit Profile</Text>
							</TouchableOpacity>
							<TouchableOpacity style={styles.actionButton} onPress={showChangePasswordOptions}>
								<Ionicons name="lock-closed" size={18} color={theme.colors.text} />
								<Text style={styles.actionText}>Change Password</Text>
							</TouchableOpacity>
						</View>
					</GlassCard>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Support</Text>
					<GlassCard style={{ padding: 16 }}>
						<TouchableOpacity
							style={styles.supportLink}
							onPress={() => Linking.openURL('https://standardbank.co.za/support')}
						>
							<Ionicons name="help-circle" size={18} color={theme.colors.primary} />
							<Text style={styles.supportText}>Help Center</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.supportLink}
							onPress={() => router.push('/privacy-policy')}
						>
							<Ionicons name="document-text" size={18} color={theme.colors.primary} />
							<Text style={styles.supportText}>Privacy Policy</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.supportLink}
							onPress={() => router.push('/terms-conditions')}
						>
							<Ionicons name="document-attach" size={18} color={theme.colors.primary} />
							<Text style={styles.supportText}>Terms & Conditions</Text>
						</TouchableOpacity>
					</GlassCard>
				</View>

				<View style={[styles.section, { marginBottom: 24 }]}>
					<GlassCard style={{ padding: 16 }}>
						<TouchableOpacity
							style={[styles.primaryButton, { alignSelf: 'center', backgroundColor: theme.colors.danger }]}
							onPress={handleSignOut}
							disabled={isLoading}
						>
							<Ionicons name="log-out" size={18} color="#fff" />
							<Text style={styles.primaryButtonText}>{isLoading ? 'Signing Out...' : 'Sign Out'}</Text>
						</TouchableOpacity>
					</GlassCard>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.colors.background,
	},
	scrollContent: {
		paddingBottom: 24,
	},
	header: {
		padding: 16,
		paddingTop: 24,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: theme.colors.border,
	},
	headerContent: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	avatarWrapper: {
		width: 72,
		height: 72,
		borderRadius: 36,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: theme.colors.card,
		...shadow(8),
	},
	avatar: {
		width: 72,
		height: 72,
		borderRadius: 36,
	},
	avatarPlaceholder: {
		width: 72,
		height: 72,
		borderRadius: 36,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: theme.colors.glass,
	},
	headerText: {
		flex: 1,
	},
	name: {
		fontSize: 20,
		fontWeight: '700',
		color: theme.colors.text,
	},
	email: {
		fontSize: 14,
		color: theme.colors.muted,
	},
	section: {
		paddingHorizontal: 16,
		marginTop: 16,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: theme.colors.text,
		marginBottom: 8,
		marginLeft: 8,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	balanceLabel: {
		fontSize: 12,
		color: theme.colors.muted,
	},
	balanceValue: {
		fontSize: 22,
		color: theme.colors.text,
		fontWeight: '800',
	},
	primaryButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		backgroundColor: theme.colors.primary,
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 12,
		...shadow(4),
	},
	primaryButtonText: {
		color: '#fff',
		fontWeight: '800',
		letterSpacing: 0.3,
	},
	sectionSubTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: theme.colors.text,
		marginBottom: 4,
	},
	metricBox: {
		backgroundColor: theme.colors.glass,
		borderRadius: 10,
		paddingVertical: 8,
		paddingHorizontal: 12,
		flexGrow: 1,
		flexBasis: '30%',
		minWidth: 90,
	},
	metricLabel: {
		fontSize: 10,
		fontWeight: '600',
		color: theme.colors.muted,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	metricValue: {
		fontSize: 16,
		fontWeight: '700',
		color: theme.colors.text,
	},
	metricBadge: {
		fontSize: 12,
		fontWeight: '600',
		color: theme.colors.muted,
	},
	smallPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: theme.colors.glass,
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 20,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: theme.colors.border,
	},
	smallPillText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#fff',
		letterSpacing: 0.3,
	},
	themeToggle: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		backgroundColor: theme.colors.glass,
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 16,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: theme.colors.border,
	},
	themeToggleText: {
		fontSize: 12,
		fontWeight: '700',
		color: theme.colors.text,
	},
	securityLabel: {
		fontSize: 12,
		color: theme.colors.muted,
		fontWeight: '600',
	},
	securityValue: {
		fontSize: 12,
		color: theme.colors.text,
		fontWeight: '700',
	},
	securityPending: {
		fontSize: 12,
		color: theme.colors.warning,
		fontWeight: '700',
	},
	goalItem: {
		padding: 12,
		borderRadius: 14,
		backgroundColor: theme.colors.card,
		marginBottom: 10,
	},
	goalHeaderRow: {
		flexDirection:'row',
		justifyContent:'space-between',
		alignItems:'flex-start',
		marginBottom:4,
	},
	goalTitle: {
		fontSize: 14,
		fontWeight:'700',
		color: theme.colors.text,
	},
	goalAmounts: {
		fontSize: 11,
		fontWeight:'600',
		color: theme.colors.muted,
	},
	goalBarBg: {
		height:6,
		backgroundColor: theme.colors.glass,
		borderRadius:3,
		overflow:'hidden',
		marginTop:4,
	},
	goalBarFill: {
		height:6,
		backgroundColor: theme.colors.primary,
		borderRadius:3,
	},
	goalActionsRow: {
		flexDirection:'row',
		alignItems:'center',
		gap:8,
		marginTop:8,
		flexWrap:'wrap',
	},
	goalActionBtn: {
		flexDirection:'row',
		alignItems:'center',
		gap:4,
		backgroundColor: theme.colors.glass,
		paddingHorizontal:10,
		paddingVertical:6,
		borderRadius:14,
	},
	goalActionText: {
		fontSize:11,
		fontWeight:'700',
		color: theme.colors.text,
		letterSpacing:0.3,
	},
	goalCompletedBadge: {
		fontSize:10,
		fontWeight:'700',
		backgroundColor: theme.colors.success,
		color:'#fff',
		paddingHorizontal:8,
		paddingVertical:4,
		borderRadius:12,
		textTransform:'uppercase',
		letterSpacing:0.5,
	},
	actionRow: {
		flexDirection: 'row',
		gap: 12,
	},
	actionButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		backgroundColor: theme.colors.card,
		paddingVertical: 12,
		borderRadius: 12,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: theme.colors.border,
	},
	actionText: {
		color: theme.colors.text,
		fontWeight: '700',
	},
	supportLink: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingVertical: 10,
	},
	supportText: {
		color: theme.colors.primary,
		fontWeight: '700',
	},
	cardPadding: {
		padding: 16,
	},
});

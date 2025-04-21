import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '~/src/components/ui/button';
import { useAuth } from '~/src/hooks/useAuth';

interface SettingItemProps {
    icon: keyof typeof MaterialIcons.glyphMap;
    title: string;
    subtitle?: string;
    value: string | boolean;
    onPress: () => void;
    type?: 'arrow' | 'switch';
    tintColor?: string;
    isLast?: boolean;
}

const SettingsScreen = () => {
    // Settings states
    const [sessionLanguage, setSessionLanguage] = useState('English');
    const [transcriptionLanguage, setTranscriptionLanguage] = useState('English');
    const [autoTranscribe, setAutoTranscribe] = useState(true);
    const [highQualityAudio, setHighQualityAudio] = useState(true);
    const [noiseReduction, setNoiseReduction] = useState(true);
    const [autoSave, setAutoSave] = useState(true);
    const [dataSharing, setDataSharing] = useState(false);
    const { handleLogout } = useAuth(); // Get logout function

    const renderSettingItem = ({
        icon,
        title,
        subtitle,
        value,
        onPress: handleLogout,
        type = 'arrow',
        tintColor = '#2D796C',
        isLast = false,
    }: SettingItemProps) => (
        <TouchableOpacity
            style={[styles.settingItem, isLast && { borderBottomWidth: 0 }]}
            onPress={handleLogout}
            activeOpacity={0.7}
        >
            <View style={styles.settingIconContainer}>
                <MaterialIcons name={icon} size={24} color={tintColor} />
            </View>
            <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{title}</Text>
                {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
            </View>
            {type === 'arrow' && (
                <View style={styles.settingValue}>
                    <Text style={styles.valueText}>{value}</Text>
                    <MaterialIcons name="chevron-right" size={24} color="#999" />
                </View>
            )}
            {type === 'switch' && (
                <Switch
                    value={Boolean(value)}
                    onValueChange={handleLogout}
                    trackColor={{ false: '#D1D1D6', true: '#9ED5CA' }}
                    thumbColor={value ? '#2D796C' : '#F4F4F4'}
                    ios_backgroundColor="#D1D1D6"
                />
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>

            <LinearGradient colors={['#2D796C', '#235F55']} style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Settings</Text>
                    <Text style={styles.headerSubtitle}>Configure your session preferences</Text>
                </View>
            </LinearGradient>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Language Settings</Text>
                    <View style={styles.groupContainer}>
                        {renderSettingItem({
                            icon: 'language',
                            title: 'Session Language',
                            subtitle: 'Language used during the session',
                            value: sessionLanguage,
                            onPress: () => { },
                            type: 'arrow',
                            isLast: false,
                        })}
                        {renderSettingItem({
                            icon: 'translate',
                            title: 'Transcription Language',
                            subtitle: 'Language for AI transcription',
                            value: transcriptionLanguage,
                            onPress: () => { },
                            type: 'arrow',
                            isLast: true,
                        })}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recording Settings</Text>
                    <View style={styles.groupContainer}>
                        {renderSettingItem({
                            icon: 'high-quality',
                            title: 'High Quality Audio',
                            subtitle: 'Record in high definition audio',
                            value: highQualityAudio,
                            type: 'switch',
                            onPress: () => setHighQualityAudio(!highQualityAudio),
                            isLast: false,
                        })}
                        {renderSettingItem({
                            icon: 'noise-control-off',
                            title: 'Noise Reduction',
                            subtitle: 'Reduce background noise during recording',
                            value: noiseReduction,
                            type: 'switch',
                            onPress: () => setNoiseReduction(!noiseReduction),
                            isLast: true,
                        })}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>AI & Transcription</Text>
                    <View style={styles.groupContainer}>
                        {renderSettingItem({
                            icon: 'record-voice-over',
                            title: 'Auto Transcription',
                            subtitle: 'Automatically transcribe during session',
                            value: autoTranscribe,
                            type: 'switch',
                            onPress: () => setAutoTranscribe(!autoTranscribe),
                            isLast: false,
                        })}
                        {renderSettingItem({
                            icon: 'medical-services',
                            title: 'Medical Terminology',
                            subtitle: 'Configure specialty-specific terms',
                            value: 'General Practice',
                            onPress: () => { },
                            type: 'arrow',
                            isLast: true,
                        })}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Storage & Privacy</Text>
                    <View style={styles.groupContainer}>
                        {renderSettingItem({
                            icon: 'save',
                            title: 'Auto Save',
                            subtitle: 'Automatically save session recordings',
                            value: autoSave,
                            type: 'switch',
                            onPress: () => setAutoSave(!autoSave),
                            isLast: false,
                        })}
                        {renderSettingItem({
                            icon: 'share',
                            title: 'Data Sharing',
                            subtitle: 'Share anonymous data for improvement',
                            value: dataSharing,
                            type: 'switch',
                            onPress: () => setDataSharing(!dataSharing),
                            isLast: true,
                        })}
                    </View>
                </View>
                <View style={styles.logoutButton}>
                <TouchableOpacity onPress={handleLogout} style={{ backgroundColor: 'white' }}>
    <Text style={styles.logoutText}>Logout</Text>
</TouchableOpacity>
                </View>
                <View style={styles.infoCard}>
                    <MaterialIcons name="info-outline" size={20} color="#2D796C" style={styles.infoIcon} />
                    <Text style={styles.infoText}>
                        All settings are automatically synced across your devices
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7F9',
    },
    logoutButton: {
        backgroundColor: 'white', // Ensures white background for the button
        borderRadius: 12,
        paddingVertical: 14,  // Consistent padding for the button
        paddingHorizontal: 16,  // Consistent padding for the button
        borderBottomWidth: 1,  // Optional, to match other cards
        borderBottomColor: '#EFEFEF',  // Match border color to keep consistent design
        alignItems: 'center',  // Center the text horizontally inside the button
        justifyContent: 'center',  // Center the text vertically inside the button
        marginBottom: 24,
        marginTop: 10, // Optional, you can adjust margin as needed
    },
    
    logoutText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#2D796C',  // Same color as the card titles
        textAlign: 'center',  // Center the text inside the button
    },
    

    header: {
        padding: 20,
        paddingTop: 60,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerContent: {
        marginTop: 10,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: 'white',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2D796C',
        marginBottom: 16,
    },
    groupContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 24,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EFEFEF',
    },
    settingIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F7F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 4,
    },
    settingSubtitle: {
        fontSize: 14,
        color: '#666',
    },
    settingValue: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    valueText: {
        fontSize: 14,
        color: '#666',
        marginRight: 4,
    },
    infoCard: {
        backgroundColor: '#e0f7f2',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    infoIcon: {
        marginRight: 8,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: '#2D796C',
        lineHeight: 20,
    },
});

export default SettingsScreen;
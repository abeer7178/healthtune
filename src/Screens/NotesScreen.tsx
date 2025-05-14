import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  TextInput,
  StyleProp,
  TextStyle,
  ViewStyle,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { sendAIGeneratedNotes, sendDoctorNotes } from '../../src/api/api';
import PDFGeneratorButton from '../../src/Screens/pdfgeneration';
import Markdown from 'react-native-markdown-display';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { Clipboard } from 'react-native';
import Toast from 'react-native-toast-message';

const ASSEMBLY_AI_API_KEY = 'e610f8c7a07c46669ed449a0add0de2e';

const initialLayout = { width: Dimensions.get('window').width };

interface EditorStyles {
  container: StyleProp<ViewStyle>;
  header: StyleProp<ViewStyle>;
  headerContent: StyleProp<ViewStyle>;
  backButton: StyleProp<ViewStyle>;
  headerTitle: StyleProp<TextStyle>;
  tabBar: StyleProp<ViewStyle>;
  tabIndicator: StyleProp<ViewStyle>;
  tabLabel: StyleProp<TextStyle>;
  tabContent: StyleProp<ViewStyle>;
  tabScrollView: StyleProp<ViewStyle>;
  aiTabContent: StyleProp<ViewStyle>;
  notesContainer: StyleProp<ViewStyle>;
  notesText: StyleProp<TextStyle>;
  transcriptionText: StyleProp<TextStyle>;
  sendButton: StyleProp<ViewStyle>;
  sendButtonText: StyleProp<TextStyle>;
  disabledButton: StyleProp<ViewStyle>;
  editorContainer: StyleProp<ViewStyle>;
  editSaveContainer: StyleProp<ViewStyle>;
  editSaveButton: StyleProp<ViewStyle>;
  editSaveButtonText: StyleProp<TextStyle>;
  editor: StyleProp<TextStyle>;
  editorUnderline: StyleProp<TextStyle>;
  navigationContainer: StyleProp<ViewStyle>;
  navButton: StyleProp<ViewStyle>;
  navButtonText: StyleProp<TextStyle>;
  pdfButtonTab: StyleProp<ViewStyle>;
  micButton: StyleProp<ViewStyle>;
  micButtonText: StyleProp<TextStyle>;
  copyButton: StyleProp<ViewStyle>;
  copyButtonText: StyleProp<TextStyle>;
}

interface TranscriptionStatus {
  status: string;
  text: string;
  loading: boolean;
}

const recordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: '.m4a',
    outputFormat: 2, // MPEG_4
    audioEncoder: 3, // AAC
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    outputFormat: 2, // MPEG4AAC
    audioQuality: 0, // Max quality
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

const EditorInput = React.memo(
  ({
    initialValue,
    isEditing,
    isBold,
    isItalic,
    isUnderline,
    onSave,
    onTextChange,
    language,
  }: {
    initialValue: string;
    isEditing: boolean;
    isBold: boolean;
    isItalic: boolean;
    isUnderline: boolean;
    onSave: (text: string) => void;
    onTextChange: (text: string) => void;
    language: string;
  }) => {
    const [localText, setLocalText] = useState(initialValue);
    const [isRecording, setIsRecording] = useState(false);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [recordingUri, setRecordingUri] = useState<string | null>(null);
    const [isProcessingTranscription, setIsProcessingTranscription] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [transcriptionStatus, setTranscriptionStatus] = useState<TranscriptionStatus>({
      status: 'pending',
      text: '',
      loading: false,
    });
    const textRef = useRef<string>(initialValue);

    useEffect(() => {
      console.log('EditorInput: Syncing localText with initialValue:', initialValue);
      setLocalText(initialValue);
      textRef.current = initialValue;
    }, [initialValue]);

    const startRecording = useCallback(async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Please allow microphone access',
          });
          return;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const newRecording = new Audio.Recording();
        await newRecording.prepareToRecordAsync(recordingOptions);
        await newRecording.startAsync();
        setRecording(newRecording);
        setIsRecording(true);
        console.log('EditorInput: Recording started');
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Recording started',
        });
      } catch (error) {
        console.error('EditorInput: Error starting recording:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to start recording',
        });
      }
    }, []);

    const stopRecording = useCallback(async () => {
      if (!recording) return;
      setIsRecording(false);

      try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecordingUri(uri);
        setRecording(null);
        console.log('EditorInput: Recording stopped, URI:', uri);
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Recording stopped',
        });

        if (uri) {
          await uploadToAssemblyAI(uri);
        }
      } catch (error) {
        console.error('EditorInput: Error stopping recording:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to stop recording',
        });
      }
    }, [recording, language]);

    const uploadToAssemblyAI = useCallback(
      async (audioUri: string): Promise<void> => {
        try {
          if (!audioUri) {
            setIsProcessingTranscription(false);
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: 'No audio file available',
            });
            return;
          }

          console.log('Audio URI:', audioUri);
          setIsProcessingTranscription(true);
          setCurrentStep(0);

          const response = await fetch(audioUri);
          if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.status}`);
          }
          const audioBlob = await response.blob();

          console.log('Blob created:', audioBlob);
          setCurrentStep(0);

          console.log('Uploading to AssemblyAI...');
          const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
            method: 'POST',
            headers: {
              authorization: ASSEMBLY_AI_API_KEY,
              'Content-Type': 'audio/m4a',
            },
            body: audioBlob,
          });

          const uploadData = await uploadResponse.json();
          console.log('Upload Response:', uploadData);

          if (uploadData.error) {
            setIsProcessingTranscription(false);
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: 'Failed to upload audio',
            });
            return;
          }

          setCurrentStep(1);

          let languageCode = 'en';
          if (language === 'Arabic') {
            languageCode = 'ar';
          }

          console.log('Requesting Transcription...');
          const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
            method: 'POST',
            headers: {
              authorization: ASSEMBLY_AI_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              audio_url: uploadData.upload_url,
              language_code: languageCode,
            }),
          });

          const transcriptData = await transcriptResponse.json();
          console.log('Transcript Response:', transcriptData);

          if (transcriptData.error) {
            setIsProcessingTranscription(false);
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: 'Failed to initiate transcription',
            });
            return;
          }

          console.log('Transcription ID:', transcriptData.id);

          checkTranscriptionStatus(transcriptData.id);
        } catch (error) {
          console.error('Error uploading to AssemblyAI:', error);
          setIsProcessingTranscription(false);
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'An error occurred during audio upload',
          });
        }
      },
      [language]
    );

    const checkTranscriptionStatus = useCallback(
      (transcriptionId: string) => {
        setTranscriptionStatus((prev) => ({ ...prev, loading: true }));
        setCurrentStep(2);

        const interval = setInterval(async () => {
          try {
            const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptionId}`, {
              headers: { authorization: ASSEMBLY_AI_API_KEY },
            });
            const data = await response.json();

            setTranscriptionStatus((prev) => ({
              ...prev,
              status: data.status,
              text: data.text || prev.text,
            }));

            if (data.status === 'processing') {
              setCurrentStep(3);
            }

            if (data.status === 'completed' || data.status === 'failed') {
              clearInterval(interval);
              setTranscriptionStatus((prev) => ({ ...prev, loading: false }));
              setIsProcessingTranscription(false);
              setCurrentStep(4);

              if (data.status === 'completed') {
                const transcribedText = data.text || '';
                const formattedText = transcribedText.replace(/\.\s+/g, '.\n');
                setLocalText((prev) => (prev ? prev + '\n' + formattedText : formattedText));
                textRef.current = formattedText;
                onTextChange(formattedText);
                console.log('EditorInput: Transcription completed, text:', formattedText);
                Toast.show({
                  type: 'success',
                  text1: 'Success',
                  text2: 'Transcription completed',
                });
              } else {
                Toast.show({
                  type: 'error',
                  text1: 'Error',
                  text2: 'Transcription failed',
                });
              }
            }
          } catch (error) {
            clearInterval(interval);
            setTranscriptionStatus((prev) => ({ ...prev, loading: false }));
            setIsProcessingTranscription(false);
            console.error('EditorInput: Error checking transcription status:', error);
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: 'Failed to check transcription status',
            });
          }
        }, 5000);

        return () => clearInterval(interval);
      },
      [onTextChange]
    );

    return (
      <View style={styles.editorContainer}>
        <View style={styles.editSaveContainer}>
          {isEditing && (
            <TouchableOpacity
              onPress={isRecording ? stopRecording : startRecording}
              style={styles.micButton}
            >
              <MaterialIcons
                name={isRecording ? 'mic-off' : 'mic'}
                size={24}
                color="white"
              />
              <Text style={styles.micButtonText}>
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <TextInput
          multiline
          placeholder={isEditing ? 'Transcribed text will appear here...' : 'No notes saved yet'}
          value={localText}
          onChangeText={(text) => {
            console.log('EditorInput: Text changed to:', text);
            setLocalText(text);
            textRef.current = text;
            onTextChange(text);
          }}
          textAlignVertical="top"
          editable={isEditing}
          style={[
            styles.editor,
            isBold && { fontWeight: 'bold' },
            isItalic && { fontStyle: 'italic' },
            isUnderline && styles.editorUnderline,
            !isEditing && { color: '#666' },
          ]}
          accessibilityLabel="Doctor Notes Display"
        />
      </View>
    );
  }
);

const NotesScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { notes = '', transcription = '', language = 'English' } = route.params as {
    notes: string;
    transcription: string;
    language?: string;
  };

  const [index, setIndex] = useState(0);
  const [doctorNotes, setDoctorNotes] = useState<string>('');
  const [currentText, setCurrentText] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(true);
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [isUnderline, setIsUnderline] = useState<boolean>(false);
  const [localText, setLocalText] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [aiNotes, setAiNotes] = useState<string>(notes);
  const [shouldSendNotes, setShouldSendNotes] = useState<boolean>(false);
  const editorTextRef = useRef<string>('');
  const doctorNotesRef = useRef<string>('');

  const routes = useMemo(
    () => [
      { key: 'transcription', title: 'Transcription' },
      { key: 'aiNotes', title: 'AI Notes' },
      { key: 'doctorNotes', title: 'Doctor Notes' },
    ],
    []
  );

  useEffect(() => {
    // Sync AI notes from route params
    setAiNotes(notes);
  }, [notes]);

  // Update doctorNotesRef whenever doctorNotes changes
  useEffect(() => {
    console.log('NotesScreen: doctorNotes updated to:', doctorNotes);
    doctorNotesRef.current = doctorNotes;
  }, [doctorNotes]);

  // Send notes to API after doctorNotes is updated
  useEffect(() => {
    if (shouldSendNotes) {
      sendNotesToAPI();
      setShouldSendNotes(false);
    }
  }, [shouldSendNotes, doctorNotes, aiNotes]);

  const sendNotesToAPI = useCallback(async () => {
    let aiSuccess = false;
    let doctorSuccess = false;

    console.log('sendNotesToAPI: Attempting to send notes');
    console.log('AI Notes to send:', aiNotes);
    console.log('Doctor Notes to send (state):', doctorNotes);
    console.log('Doctor Notes to send (ref):', doctorNotesRef.current);

    if (aiNotes && aiNotes.trim()) {
      try {
        await sendAIGeneratedNotes(aiNotes);
        aiSuccess = true;
        console.log('sendNotesToAPI: AI notes sent successfully');
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'AI notes sent successfully',
        });
      } catch (error: any) {
        console.error('sendNotesToAPI: Error sending AI notes:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: `Failed to send AI notes: ${error.message || 'Unknown error'}`,
        });
      }
    }

    const notesToSend = doctorNotesRef.current;
    if (notesToSend && notesToSend.trim()) {
      try {
        console.log('sendNotesToAPI: Sending doctor notes:', notesToSend);
        await sendDoctorNotes(notesToSend);
        doctorSuccess = true;
        console.log('sendNotesToAPI: Doctor notes sent successfully');
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Doctor notes sent successfully',
        });
      } catch (error: any) {
        console.error('sendNotesToAPI: Error sending doctor notes:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: `Failed to send doctor notes: ${error.message || 'Unknown error'}`,
        });
      }
    } else {
      console.log('sendNotesToAPI: No doctor notes to send');
    }

    if (aiSuccess && doctorSuccess) {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'All notes sent successfully',
      });
    }
  }, [aiNotes]);

  const handleSave = useCallback((text: string) => {
    console.log('handleSave: Saving doctor notes:', text);
    
    // Update all state variables that hold doctor notes
    setDoctorNotes(text);
    setCurrentText(text);
    setLocalText(text);
    
    // Disable editing and mark as saved
    setIsEditing(false);
    setIsSaved(true);
    
    // Trigger sendNotesToAPI after state updates
    setShouldSendNotes(true);
    
    console.log('handleSave: After saving - currentText=', text, 'doctorNotes=', text, 'localText=', text);
    Toast.show({
      type: 'success',
      text1: 'Success',
      text2: 'Notes saved successfully',
    });
  }, []);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setIsSaved(false);
    console.log('handleEdit: Editing enabled');
    Toast.show({
      type: 'success',
      text1: 'Success',
      text2: 'Editing enabled',
    });
  }, []);

  const handleTextChange = useCallback(
    (text: string) => {
      console.log('handleTextChange: Text changed - received text=', text);
      setLocalText(text);
      setCurrentText(text);
      setDoctorNotes(text);
      editorTextRef.current = text;
      setIsSaved(false);
      console.log('handleTextChange: Updated - localText=', text, 'currentText=', text, 'doctorNotes=', text);
    },
    []
  );

  const TranscriptionTab = React.memo(() => {
    useEffect(() => {
      console.log('TranscriptionTab mounted');
      return () => {
        console.log('TranscriptionTab unmounted');
      };
    }, []);

    return (
      <ScrollView
        contentContainerStyle={styles.aiTabContent}
        style={styles.tabScrollView}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        <View style={styles.notesContainer}>
          <Text style={styles.notesText}>{transcription || 'No transcription available.'}</Text>
          <TouchableOpacity
            onPress={() => {
              if (transcription) {
                Clipboard.setString(transcription);
                Toast.show({
                  type: 'success',
                  text1: 'Success',
                  text2: 'Transcription copied to clipboard',
                });
              } else {
                Toast.show({
                  type: 'error',
                  text1: 'Error',
                  text2: 'No transcription to copy',
                });
              }
            }}
            style={styles.copyButton}
          >
            <Text style={styles.copyButtonText}>Copy to Clipboard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  });

  const AINotesTab = React.memo(() => {
    useEffect(() => {
      console.log('AINotesTab mounted');
      return () => {
        console.log('AINotesTab unmounted');
      };
    }, []);

    const processedNotes = useMemo(() => {
      if (!aiNotes) return 'No AI-generated notes available.';
      return aiNotes
        .split('\n')
        .map(line => {
          let cleanedLine = line.replace(/^#+/, '').trim();
          if (/^#/.test(line)) {
            cleanedLine = `**${cleanedLine}**`;
          }
          return cleanedLine;
        })
        .join('\n')
        .replace(/\\n/g, '\n\n')
         .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '')
      .replace(/'/g, '')
      .replace(/\\/g, '')
       .replace(/#/g, '')
      .replace(/\*\*/g, '')
      .replace(/###/g, '')
        .replace(/(-.*)\n\n/g, '$1\n');
    }, [aiNotes]);

    const markdownStyles = StyleSheet.create({
      body: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        fontSize: 16,
        lineHeight: 24,
        color: '#333',
        backgroundColor: '#FFFFFF',
      } as TextStyle,
      heading1: {
        fontSize: 32,
        fontWeight: 'bold',
        marginTop: 24,
        marginBottom: 16,
        color: '#111',
      } as TextStyle,
      heading2: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 24,
        marginBottom: 16,
        color: '#111',
      } as TextStyle,
      heading3: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 24,
        marginBottom: 16,
        color: '#111',
      } as TextStyle,
      paragraph: {
        marginTop: 0,
        marginBottom: 16,
      } as TextStyle,
      bullet_list: {
        marginTop: 0,
        marginBottom: 16,
        paddingLeft: 20,
      } as ViewStyle,
      ordered_list: {
        marginTop: 0,
        marginBottom: 16,
        paddingLeft: 20,
      } as ViewStyle,
      link: {
        color: '#0366d6',
        textDecorationLine: 'none',
      } as TextStyle,
      code_inline: {
        fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
        paddingHorizontal: 4,
        paddingVertical: 2,
        fontSize: 13,
        backgroundColor: 'rgba(27, 31, 35, 0.05)',
        borderRadius: 3,
      } as TextStyle,
      code_block: {
        fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
        padding: 16,
        fontSize: 13,
        lineHeight: 20,
        backgroundColor: '#f6f8fa',
        borderRadius: 3,
        marginBottom: 16,
      } as TextStyle,
      table: {
        width: '100%',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#dfe2e5',
      } as ViewStyle,
      thead: {
        backgroundColor: '#f6f8fa',
      } as ViewStyle,
      th: {
        padding: 6,
        borderWidth: 1,
        borderColor: '#dfe2e5',
        fontWeight: '600',
      } as TextStyle,
      td: {
        padding: 6,
        borderWidth: 1,
        borderColor: '#dfe2e5',
      } as TextStyle,
      blockquote: {
        paddingLeft: 16,
        color: '#6a737d',
        borderLeftWidth: 4,
        borderLeftColor: '#dfe2e5',
        marginBottom: 16,
      } as ViewStyle,
      hr: {
        height: 4,
        marginVertical: 24,
        backgroundColor: '#e1e4e8',
        borderWidth: 0,
      } as ViewStyle,
      strong: {
        fontWeight: 'bold',
      } as TextStyle,
      em: {
        fontStyle: 'italic',
      } as TextStyle,
    });

    return (
      <ScrollView
        contentContainerStyle={styles.aiTabContent}
        style={styles.tabScrollView}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        <View style={styles.notesContainer}>
          <Markdown style={markdownStyles}>
            {processedNotes}
          </Markdown>
          <TouchableOpacity
            onPress={() => {
              if (aiNotes) {
                Clipboard.setString(aiNotes);
                Toast.show({
                  type: 'success',
                  text1: 'Success',
                  text2: 'AI-generated notes copied to clipboard',
                });
              } else {
                Toast.show({
                  type: 'error',
                  text1: 'Error',
                  text2: 'No AI-generated note to copy',
                });
              }
            }}
            style={styles.copyButton}
          >
            <Text style={styles.copyButtonText}>Copy to Clipboard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  });

  const DoctorNotesTab = React.memo(() => {
    useEffect(() => {
      console.log('DoctorNotesTab mounted with doctorNotes:', doctorNotes);
      return () => {
        console.log('DoctorNotesTab unmounted');
      };
    }, [doctorNotes]);

    const handleSavePress = () => {
      const textToSave = editorTextRef.current;
      console.log('DoctorNotesTab: handleSavePress - Saving text:', textToSave);
      handleSave(textToSave);
    };

    return (
      <ScrollView
        contentContainerStyle={styles.aiTabContent}
        style={styles.tabScrollView}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        <View style={styles.notesContainer}>
          <View style={styles.editorContainer}>
            <View style={styles.editSaveContainer}>
              {isEditing ? (
                <>
                  <TouchableOpacity onPress={() => {
                    setIsBold(!isBold);
                    Toast.show({
                      type: 'success',
                      text1: 'Success',
                      text2: `Bold formatting ${!isBold ? 'enabled' : 'disabled'}`,
                    });
                  }} style={styles.editSaveButton}>
                    <Text style={styles.editSaveButtonText}>Bold</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={handleSavePress} 
                    style={styles.editSaveButton}
                  >
                    <Text style={styles.editSaveButtonText}>Save</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity onPress={handleEdit} style={styles.editSaveButton}>
                  <Text style={styles.editSaveButtonText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
            <EditorInput
              initialValue={currentText}
              isEditing={isEditing}
              isBold={isBold}
              isItalic={isItalic}
              isUnderline={isUnderline}
              onSave={handleSave}
              onTextChange={handleTextChange}
              language={language}
            />
          </View>
          <PDFGeneratorButton
            notes={aiNotes}
            doctorNotesRef={doctorNotesRef} // Pass ref instead of state
            transcription={transcription}
            style={styles.pdfButtonTab}
          />
        </View>
      </ScrollView>
    );
  });

  const renderScene = useMemo(
    () =>
      SceneMap({
        transcription: TranscriptionTab,
        aiNotes: AINotesTab,
        doctorNotes: DoctorNotesTab,
      }),
    []
  );

  const renderTabBar = useCallback(
    (props: any) => (
      <TabBar
        {...props}
        style={styles.tabBar}
        indicatorStyle={styles.tabIndicator}
        labelStyle={styles.tabLabel}
        activeColor="#2D796C"
        inactiveColor="#666"
      />
    ),
    []
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#2D796C', '#235F55']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Session Notes</Text>
        </View>
      </LinearGradient>

      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={(newIndex) => {
          setIndex(newIndex);
          Toast.show({
            type: 'success',
            text1: 'Success',
            text2: `Switched to ${routes[newIndex].title} tab`,
          });
        }}
        initialLayout={initialLayout}
        lazy={true}
        renderTabBar={renderTabBar}
      />
    </SafeAreaView>
  );
};

const styles: EditorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    flex: 1,
  },
  tabBar: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabIndicator: {
    backgroundColor: '#2D796C',
    height: 3,
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'none',
    color: '#333',
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  tabScrollView: {
    flex: 1,
  },
  aiTabContent: {
    flexGrow: 1,
    padding: 20,
  },
  notesContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notesText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 20,
  },
  transcriptionText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 28,
    marginBottom: 20,
    fontFamily: 'Roboto-Regular',
    textAlign: 'justify',
  },
  sendButton: {
    marginTop: 20,
    backgroundColor: '#2D796C',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#A0A0A0',
  },
  editorContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  editSaveContainer: {
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editSaveButton: {
    backgroundColor: '#2D796C',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  editSaveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  editor: {
    flex: 1,
    minHeight: 200,
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Roboto-Regular',
    lineHeight: 24,
  },
  editorUnderline: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  navButton: {
    backgroundColor: '#2D796C',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 100,
  },
  navButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  pdfButtonTab: {
    marginTop: 20,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2D796C',
    alignItems: 'center',
  },
  micButton: {
    flexDirection: 'row',
    backgroundColor: '#2D796C',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  micButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  copyButton: {
    marginTop: 20,
    backgroundColor: '#2D796C',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  copyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NotesScreen;
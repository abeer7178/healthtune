import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Dimensions,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Clipboard } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import Markdown from 'react-native-markdown-display';

// Define the type for the route parameters
type SessionDetailsRouteParams = {
  sessionId: string;
  aiNote: string;
  doctorNote: string;
};

// Define the type for the navigation stack
type StackParamList = {
  SessionDetailsScreen: SessionDetailsRouteParams;
};

const initialLayout = { width: Dimensions.get('window').width };

// Define the shape of the styles object
interface Styles {
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
  copyButton: StyleProp<ViewStyle>;
  copyButtonText: StyleProp<TextStyle>;
}

const SessionDetailsScreen: React.FC = () => {
  const route = useRoute<RouteProp<StackParamList, 'SessionDetailsScreen'>>();
  const navigation = useNavigation();
  const { aiNote, doctorNote } = route.params;

  const [index, setIndex] = useState(0);
  const routes = useMemo(
    () => [
      { key: 'aiNotes', title: 'AI Generated Notes' },
      { key: 'doctorNotes', title: 'Doctor Notes' },
    ],
    []
  );

  const AINotesTab = React.memo(() => {
    useEffect(() => {
      console.log('AINotesTab mounted');
      return () => {
        console.log('AINotesTab unmounted');
      };
    }, []);

    // Preprocess aiNote to remove ## and make headings bold
    const processedAiNote = useMemo(() => {
      if (!aiNote) return 'No AI-generated note available.';
      // Split into lines and process each line
      return aiNote
        .split('\n')
        .map(line => {
          // Remove # or ## and trim whitespace
          let cleanedLine = line.replace(/^#+/, '').trim();
          // Check if the original line started with # or ## to apply bold
          if (/^#/.test(line)) {
            cleanedLine = `**${cleanedLine}**`; // Wrap in ** for bold
          }
          return cleanedLine;
        })
        .join('\n')
        // Replace \n with double newlines for paragraph separation
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
    }, [aiNote]);

    // Markdown styles with explicit typing
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
        fontWeight: 'bold', // Changed to 'bold' for consistency
        marginTop: 24,
        marginBottom: 16,
        color: '#111',
      } as TextStyle,
      heading2: {
        fontSize: 24,
        fontWeight: 'bold', // Changed to 'bold' for consistency
        marginTop: 24,
        marginBottom: 16,
        color: '#111',
      } as TextStyle,
      heading3: {
        fontSize: 20,
        fontWeight: 'bold', // Changed to 'bold' for consistency
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
        fontWeight: 'bold', // Changed to 'bold' to align with request
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
            {processedAiNote}
          </Markdown>
          <TouchableOpacity
            onPress={() => {
              if (aiNote) {
                Clipboard.setString(aiNote);
                Alert.alert('Copied!', 'AI-generated notes copied to clipboard.');
              } else {
                Alert.alert('Error', 'No AI-generated note to copy.');
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
      console.log('DoctorNotesTab mounted');
      return () => {
        console.log('DoctorNotesTab unmounted');
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
          <Text style={styles.notesText}>{doctorNote || 'No doctor note available.'}</Text>
          <TouchableOpacity
            onPress={() => {
              if (doctorNote) {
                Clipboard.setString(doctorNote);
                Alert.alert('Copied!', 'Doctor notes copied to clipboard.');
              } else {
                Alert.alert('Error', 'No doctor note to copy.');
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

  const renderScene = useMemo(
    () =>
      SceneMap({
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

  useEffect(() => {
    console.log('TabView re-rendered with index:', index);
  }, [index]);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#2D796C', '#235F55']} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Session Details</Text>
        </View>
      </LinearGradient>

      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={initialLayout}
        lazy={true}
        renderTabBar={renderTabBar}
      />
    </SafeAreaView>
  );
};

const styles: Styles = StyleSheet.create({
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

export default SessionDetailsScreen;
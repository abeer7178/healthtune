import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useSessionStore } from '../../src/store/store';
import dayjs from 'dayjs';

// PDF Generation and Sharing component
const PDFGeneratorButton: React.FC<{
  notes: string;
  doctorNotesRef: React.MutableRefObject<string>;
  transcription: string;
  style?: StyleProp<ViewStyle>;
}> = ({ notes, doctorNotesRef, transcription, style }) => {
  const [modalVisible, setModalVisible] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const { user, session } = useSessionStore();

  const generatePDF = async () => {
    setIsGenerating(true);
    console.log('PDFGeneratorButton: Generating PDF with:', {
      notes,
      doctorNotes: doctorNotesRef.current,
      transcription,
      patientName: session?.patientName,
      sessionType: session?.sessionType,
      sessionDate: session?.date,
      sessionDuration: session?.duration,
      doctorName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
    });

    try {
      // Convert notes to HTML with proper formatting
      const html = createPDFTemplate({
        noteType:session?.note || 'N/A',
        patientName: session?.patientName || 'N/A',
        sessionType: session?.sessionType || 'N/A',
        sessionDate: session?.date ? dayjs(session.date).format('MMM DD, YYYY • hh:mm A') : 'N/A',
        sessionDuration: session?.duration ? `${session.duration} minutes` : 'N/A',
        doctorName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'N/A',
        aiNotes: notes || 'No AI notes available',
        doctorNotes: doctorNotesRef.current || 'No doctor notes available',
        transcription: transcription || 'No transcription available',
      });

      console.log('PDFGeneratorButton: Generated HTML for PDF:', html);

      // Generate PDF file
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      // Get the filename from the URI
      const filename = uri.split('/').pop() || 'session-notes.pdf';

      // Create a more friendly filename
      const pdfFilename = `Session_${session?.id || 'unknown'}_${dayjs().format('YYYYMMDD_HHmmss')}.pdf`;

      // Copy to a nicer location with a better name
      const pdfDir = `${FileSystem.documentDirectory}pdfs/`;
      await FileSystem.makeDirectoryAsync(pdfDir, { intermediates: true }).catch(() => { });
      const newUri = `${pdfDir}${pdfFilename}`;
      await FileSystem.copyAsync({ from: uri, to: newUri });

      setModalVisible(false);
      setIsGenerating(false);

      // Open share dialog
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Session Notes',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('PDFGeneratorButton: Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF');
      setIsGenerating(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[style]}
        onPress={() => {
          if (!doctorNotesRef.current.trim()) {
            Alert.alert('Warning', 'Doctor notes are empty. Proceed to generate PDF?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Proceed', onPress: () => setModalVisible(true) },
            ]);
          } else {
            setModalVisible(true);
          }
        }}
        accessibilityLabel="Generate PDF"
      >
        <MaterialIcons name="picture-as-pdf" size={24} color="white" />
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>PDF Options</Text>

            <Text style={styles.modalDescription}>
              Generate a professional PDF document containing:
            </Text>

            <View style={styles.optionsList}>
              <View style={styles.optionItem}>
                <MaterialIcons name="check-circle" size={20} color="#2D796C" />
                <Text style={styles.optionText}>Patient Information</Text>
              </View>
              <View style={styles.optionItem}>
                <MaterialIcons name="check-circle" size={20} color="#2D796C" />
                <Text style={styles.optionText}>AI Generated Notes</Text>
              </View>
              <View style={styles.optionItem}>
                <MaterialIcons name="check-circle" size={20} color="#2D796C" />
                <Text style={styles.optionText}>Doctor Notes</Text>
              </View>
              <View style={styles.optionItem}>
                <MaterialIcons name="check-circle" size={20} color="#2D796C" />
                <Text style={styles.optionText}>Session Transcription</Text>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
                disabled={isGenerating}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.generateButton]}
                onPress={generatePDF}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="picture-as-pdf" size={20} color="white" />
                    <Text style={styles.generateButtonText}>Generate & Share</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

// PDF Template HTML generation
const createPDFTemplate = ({
  patientName,
  sessionType,
  noteType,
  sessionDate,
  sessionDuration,
  doctorName,
  aiNotes,
  doctorNotes,
  transcription,
}: {
  patientName: string;
  sessionType: string;
  noteType: string;
  sessionDate: string;
  sessionDuration: string;
  doctorName: string;
  aiNotes: string;
  doctorNotes: string;
  transcription: string;
}) => {
  console.log('createPDFTemplate: Input data:', {
    patientName,
    sessionType,
    sessionDate,
    sessionDuration,
    doctorName,
    aiNotes,
    doctorNotes,
    transcription,
  });

  // Helper function to sanitize text for HTML
  const sanitize = (text: string) => {
    return text
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '')
      .replace(/'/g, '')
      .replace(/\\/g, '')
      .replace(/#/g, '')
      .replace(/\*\*/g, '')
      .replace(/###/g, '');

  };

  // Format the notes with markdown parsing for AI notes, and simple formatting for others
  // Format the notes with markdown parsing for AI notes, and simple formatting for others
  const formatNotes = (notes: string, isAINotes: boolean = false) => {
    console.log(`formatNotes: Processing ${isAINotes ? 'AI' : 'other'} notes:`, notes);
    if (!notes || notes.trim() === '') {
      console.log('formatNotes: Notes are empty, returning empty-notes');
      return `<p class="empty-notes">${sanitize(notes || 'No content available')}</p>`;
    }

    if (isAINotes) {
      const processedNotes = notes
        .split('\n')
        .map(line => {
          let cleanedLine = line.replace(/^#+/, '').trim();
          if (/^#/.test(line)) {
            cleanedLine = `<strong class="heading">${cleanedLine}</strong>`; // Add heading class for styling
          }
          return cleanedLine;
        })
        .join('\n')
        .replace(/\\n/g, '\n\n')
        .replace(/(-.*)\n\n/g, '$1\n');

      const lines = processedNotes.split('\n').map(line => line.trim()).filter(line => line);
      let formattedContent = '';
      let inList = false;

      lines.forEach((line, index) => {
        if (line.startsWith('-')) {
          if (!inList) {
            formattedContent += '<ul>';
            inList = true;
          }
          const listItem = sanitize(line.replace(/^-/, '').trim());
          formattedContent += `<li>${listItem}</li>`;
        } else {
          if (inList) {
            formattedContent += '</ul>';
            inList = false;
          }
          // Check if the line is already wrapped in <strong> (i.e., a heading)
          if (line.includes('<strong class="heading">')) {
            formattedContent += line; // Already processed as a heading
          } else {
            formattedContent += `<p>${sanitize(line)}</p>`;
          }
        }

        if (index === lines.length - 1 && inList) {
          formattedContent += '</ul>';
        }
      });

      console.log('formatNotes: Formatted AI notes:', formattedContent);
      return formattedContent;
    } else {
      const paragraphs = notes.trim().split(/\n\n+/).filter(p => p.trim());
      if (paragraphs.length === 0) {
        console.log('formatNotes: No valid paragraphs, returning empty-notes');
        return `<p class="empty-notes">No content available</p>`;
      }

      const formatted = paragraphs.map(paragraph => `<p>${sanitize(paragraph)}</p>`).join('');
      console.log('formatNotes: Formatted non-AI notes:', formatted);
      return formatted;
    }
  };

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Session Notes - ${sanitize(patientName)}</title>
    <style>
      body {
        font-family: Helvetica, Arial, sans-serif;
        margin: 30px;
        padding: 0;
        color: #000000;
        font-size: 10pt;
        line-height: 1.4;
        background-color: #FFFFFF;
      }
.heading {
  font-weight: bold;
  color: #1E4E5F;
  font-size: 12pt; /* Adjust size as needed */
  display: block; /* Ensure it behaves like a block element */
  margin-bottom: 5px;
}
      .container {
        max-width: 100%;
        margin: 0;
        padding: 0;
      }

      .header {
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
  text-align: center;
}

.header img {
  width: 100px;
  height: auto;
}

.heading {
  font-weight: bold;
  color: #1E4E5F;
  font-size: 12pt;
  display: block;
  margin-bottom: 5px;
}

      .header-text {
        font-size: 14pt;
        font-weight: bold;
        color: #1E4E5F;
      }

      .color-bar {
        height: 8px;
        background-color: #1E4E5F;
        margin-bottom: 20px;
      }

      .title {
        font-size: 16pt;
        font-weight: bold;
        color: #1E4E5F;
        text-align: center;
        margin-bottom: 25px;
        text-transform: uppercase;
      }

      .patient-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: space-between;
        margin-bottom: 20px;
      }

      .grid-item {
        width: 48%;
        margin-bottom: 15px;
      }

      .label {
        font-size: 9pt;
        color: #1E4E5F;
        font-weight: bold;
        margin-bottom: 3px;
      }

      .value {
        font-size: 10pt;
        background-color: #E6F2F2;
        padding: 5px;
        border-radius: 2px;
        width: 100%;
        box-sizing: border-box;
      }

      .section {
        margin-bottom: 25px;
      }

      .section-title {
        font-size: 9pt;
        font-weight: bold;
        color: #1E4E5F;
        margin-bottom: 3px;
      }

      .section-content {
        background-color: #E6F2F2;
        padding: 5px;
        border-radius: 2px;
        font-size: 10pt;
        line-height: 1.5;
      }

      p {
        margin: 5px 0;
        font-size: 10pt;
        line-height: 1.4;
        text-align: justify;
      }

      strong {
        font-weight: bold;
        color: #1E4E5F;
      }

      ul {
        padding-left: 20px;
        margin: 5px 0;
      }

      li {
        margin-bottom: 4px;
        font-size: 10pt;
        line-height: 1.4;
      }

      .empty-notes {
        color: #7F8C8D;
        font-style: italic;
      }

      @media print {
        .page-break {
          page-break-before: always;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
     <div class="header">
  <img src="data:image/png;base64,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" alt="HealthTune Logo" />
</div>

      <div class="color-bar"></div>

      <div class="title">MEDICAL INSIGHTS</div>

      <div class="patient-grid">
        <div class="grid-item">
          <div class="label">Patient's Name</div>
          <div class="value">${sanitize(patientName)}</div>
        </div>
        <div class="grid-item">
          <div class="label">Date</div>
          <div class="value">${sanitize(sessionDate)}</div>
        </div>
        <div class="grid-item">
          <div class="label">Session Type</div>
          <div class="value">${sanitize(sessionType)}</div>
        </div>
        <div class="grid-item">
          <div class="label">Note Type</div>
          <div class="value">${sanitize(noteType)}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Diagnosis</div>
        <div class="section-content">
          <p class="empty-notes">No diagnosis codes available</p>
        </div>
      </div>

      <div class="section">
        <div class="section-title">AI Generated Notes</div>
        <div class="section-content">
          ${formatNotes(aiNotes, true)}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Doctor's Notes</div>
        <div class="section-content">
          ${formatNotes(doctorNotes)}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Session Transcription</div>
        <div class="section-content">
          ${formatNotes(transcription)}
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  console.log('createPDFTemplate: Generated HTML length:', html.length);
  return html;
};

// Styles
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D796C',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 16,
    color: '#555',
    marginBottom: 16,
  },
  optionsList: {
    marginBottom: 24,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  optionText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f1f1',
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#555',
    fontSize: 16,
    fontWeight: '500',
  },
  generateButton: {
    backgroundColor: '#2D796C',
    flex: 1,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default PDFGeneratorButton;
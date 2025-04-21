import React from 'react';
import { TextInput, View, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputFieldProps extends TextInputProps {
  icon: keyof typeof Ionicons.glyphMap;
}

const InputField: React.FC<InputFieldProps> = ({ icon, ...props }) => {
  return (
    <View style={styles.inputContainer}>
      <Ionicons name={icon} size={24} color="#4A5568" />
      <TextInput style={styles.input} {...props} placeholderTextColor="#718096" />
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#2D3748',
  },
});

export default InputField;

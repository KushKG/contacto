import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from '@contacto/database';
import { getHybridSearchService } from '../services/hybridSearchService';

interface TableData {
  name: string;
  rows: any[];
  schema?: any[];
}

export default function DebugDBScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<TableData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadDb = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const db = SQLite.openDatabaseSync('contacto.db');

      const tableNames = db.getAllSync("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC") as any[];
      const names = tableNames.map(t => t.name) as string[];

      const results: TableData[] = [];
      for (const name of names) {
        try {
          const schema = db.getAllSync(`PRAGMA table_info(${name})`) as any[];
          const rows = db.getAllSync(`SELECT * FROM ${name} LIMIT 200`) as any[];
          results.push({ name, rows, schema });
        } catch (innerErr) {
          console.warn('Error reading table', name, innerErr);
          results.push({ name, rows: [{ error: String(innerErr) }] });
        }
      }

      setTables(results);
    } catch (e) {
      console.error('loadDb error:', e);
      setError(e instanceof Error ? e.message : 'Failed to read database');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReset = useCallback(async () => {
    Alert.alert('Reset Contacts', 'Delete all contacts and conversations? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          // Primary: direct wipe via SQLite to avoid any service-level issues
          const db = SQLite.openDatabaseSync('contacto.db');
          db.execSync('DELETE FROM conversations');
          db.execSync('DELETE FROM contacts');

          // Also try via service (best-effort)
          try {
            const dbSvc = getDatabase();
            await dbSvc.clearAllData();
          } catch (svcErr) {
            console.warn('clearAllData service failed (ignored):', svcErr);
          }

          // Reset import flag
          await AsyncStorage.removeItem('contacto:contactsImported');

          // Rebuild tag index (will become empty)
          try {
            const hybrid = getHybridSearchService();
            await hybrid.rebuildTagIndex();
          } catch (idxErr) {
            console.warn('rebuildTagIndex failed (ignored):', idxErr);
          }

          await loadDb();
          Alert.alert('Done', 'All contacts removed. You can re-import now.');
        } catch (err) {
          console.error('Reset failed:', err);
          Alert.alert('Error', `Failed to reset database: ${String(err)}`);
        }
      }}
    ]);
  }, [loadDb]);

  useEffect(() => {
    loadDb();
  }, [loadDb]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Debug DB</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={loadDb} style={styles.reloadBtn}>
            <Text style={styles.reloadText}>Reload</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleReset} style={[styles.reloadBtn, { backgroundColor: '#ff3b30' }] }>
            <Text style={styles.reloadText}>Reset Contacts</Text>
          </TouchableOpacity>
        </View>
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.subtle}>Reading database…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>Error: {error}</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {tables.map((t) => (
            <View key={`table-${t.name}`} style={styles.tableCard}>
              <Text style={styles.tableName}>{t.name}</Text>
              {t.schema && t.schema.length > 0 ? (
                <Text style={styles.schemaText}>Schema: {t.schema.map((c: any) => `${c.name}:${c.type}`).join(', ')}</Text>
              ) : null}
              {t.rows.length === 0 ? (
                <Text style={styles.subtle}>No rows</Text>
              ) : (
                t.rows.map((row, idx) => (
                  <View key={`row-${t.name}-${idx}`} style={styles.row}>
                    <Text style={styles.rowText}>{JSON.stringify(row)}</Text>
                  </View>
                ))
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e5e5ea' },
  title: { fontSize: 20, fontWeight: '700', color: '#000' },
  reloadBtn: { backgroundColor: '#007AFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  reloadText: { color: '#fff', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  subtle: { marginTop: 8, color: '#8e8e93' },
  error: { color: '#ff3b30' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  tableCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 0.5, borderColor: '#e5e5ea' },
  tableName: { fontSize: 16, fontWeight: '700', marginBottom: 6, color: '#000' },
  schemaText: { fontSize: 12, color: '#8e8e93', marginBottom: 6 },
  row: { paddingVertical: 6, borderTopWidth: 0.5, borderTopColor: '#f2f2f7' },
  rowText: { fontFamily: 'Courier', fontSize: 12, color: '#333' },
});

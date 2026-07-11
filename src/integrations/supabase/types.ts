export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string | null
          created_at: string | null
          description: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          user_email: string | null
          user_full_name: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_email?: string | null
          user_full_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_email?: string | null
          user_full_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_persuratan: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      admin_sarpras: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      admin_tpg: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string | null
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string | null
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string | null
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      attendance_details: {
        Row: {
          attendance_record_id: string | null
          created_at: string | null
          id: string
          status: string | null
          student_id: string | null
        }
        Insert: {
          attendance_record_id?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          student_id?: string | null
        }
        Update: {
          attendance_record_id?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          student_id?: string | null
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          created_at: string | null
          created_by: string | null
          date: string | null
          id: string
          officer_name: string | null
          rombel_id: string | null
          semester_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          id?: string
          officer_name?: string | null
          rombel_id?: string | null
          semester_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date?: string | null
          id?: string
          officer_name?: string | null
          rombel_id?: string | null
          semester_id?: string | null
        }
        Relationships: []
      }
      attendance_revision_requests: {
        Row: {
          alasan: string | null
          approved_at: string | null
          approved_by: string | null
          attendance_date: string | null
          attendance_detail_id: string | null
          created_at: string | null
          id: string
          original_status: string | null
          rejection_reason: string | null
          requested_by: string | null
          requested_status: string | null
          rombel_id: string | null
          status: string | null
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          alasan?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attendance_date?: string | null
          attendance_detail_id?: string | null
          created_at?: string | null
          id?: string
          original_status?: string | null
          rejection_reason?: string | null
          requested_by?: string | null
          requested_status?: string | null
          rombel_id?: string | null
          status?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          alasan?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attendance_date?: string | null
          attendance_detail_id?: string | null
          created_at?: string | null
          id?: string
          original_status?: string | null
          rejection_reason?: string | null
          requested_by?: string | null
          requested_status?: string | null
          rombel_id?: string | null
          status?: string | null
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      backup_logs: {
        Row: {
          action_type: string | null
          created_at: string | null
          error_message: string | null
          file_name: string | null
          file_size_bytes: number | null
          id: string
          notes: string | null
          performed_by: string | null
          records_count: Json | null
          status: string | null
          tables_included: Json | null
        }
        Insert: {
          action_type?: string | null
          created_at?: string | null
          error_message?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          notes?: string | null
          performed_by?: string | null
          records_count?: Json | null
          status?: string | null
          tables_included?: Json | null
        }
        Update: {
          action_type?: string | null
          created_at?: string | null
          error_message?: string | null
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          notes?: string | null
          performed_by?: string | null
          records_count?: Json | null
          status?: string | null
          tables_included?: Json | null
        }
        Relationships: []
      }
      berkas_pembelajaran: {
        Row: {
          analisis_cp_atp_link: string | null
          atp_link: string | null
          catatan_oleh: string | null
          catatan_oleh_nama: string | null
          catatan_perbaikan: string | null
          created_at: string | null
          created_by: string | null
          diperiksa_at: string | null
          diperiksa_oleh: string | null
          diperiksa_oleh_nama: string | null
          guru_id: string | null
          id: string
          modul_ajar_link: string | null
          promes_link: string | null
          prota_link: string | null
          prota_promes_link: string | null
          rombel_mata_pelajaran_id: string | null
          rpa_link: string | null
          semester_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          analisis_cp_atp_link?: string | null
          atp_link?: string | null
          catatan_oleh?: string | null
          catatan_oleh_nama?: string | null
          catatan_perbaikan?: string | null
          created_at?: string | null
          created_by?: string | null
          diperiksa_at?: string | null
          diperiksa_oleh?: string | null
          diperiksa_oleh_nama?: string | null
          guru_id?: string | null
          id?: string
          modul_ajar_link?: string | null
          promes_link?: string | null
          prota_link?: string | null
          prota_promes_link?: string | null
          rombel_mata_pelajaran_id?: string | null
          rpa_link?: string | null
          semester_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          analisis_cp_atp_link?: string | null
          atp_link?: string | null
          catatan_oleh?: string | null
          catatan_oleh_nama?: string | null
          catatan_perbaikan?: string | null
          created_at?: string | null
          created_by?: string | null
          diperiksa_at?: string | null
          diperiksa_oleh?: string | null
          diperiksa_oleh_nama?: string | null
          guru_id?: string | null
          id?: string
          modul_ajar_link?: string | null
          promes_link?: string | null
          prota_link?: string | null
          prota_promes_link?: string | null
          rombel_mata_pelajaran_id?: string | null
          rpa_link?: string | null
          semester_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      book_copies: {
        Row: {
          barcode: string | null
          book_id: string | null
          copy_number: number | null
          created_at: string | null
          id: string
          status: string | null
        }
        Insert: {
          barcode?: string | null
          book_id?: string | null
          copy_number?: number | null
          created_at?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          barcode?: string | null
          book_id?: string | null
          copy_number?: number | null
          created_at?: string | null
          id?: string
          status?: string | null
        }
        Relationships: []
      }
      book_loans: {
        Row: {
          book_copy_ids: Json | null
          book_ids: Json | null
          borrower_id: string | null
          borrower_name: string | null
          borrower_type: string | null
          created_at: string | null
          created_by: string | null
          id: string
          rombel_id: string | null
          status: string | null
          tanggal_peminjaman: string | null
          tanggal_pengembalian: string | null
        }
        Insert: {
          book_copy_ids?: Json | null
          book_ids?: Json | null
          borrower_id?: string | null
          borrower_name?: string | null
          borrower_type?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          rombel_id?: string | null
          status?: string | null
          tanggal_peminjaman?: string | null
          tanggal_pengembalian?: string | null
        }
        Update: {
          book_copy_ids?: Json | null
          book_ids?: Json | null
          borrower_id?: string | null
          borrower_name?: string | null
          borrower_type?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          rombel_id?: string | null
          status?: string | null
          tanggal_peminjaman?: string | null
          tanggal_pengembalian?: string | null
        }
        Relationships: []
      }
      books: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          isbn: string | null
          jenis_buku: string | null
          judul: string | null
          jumlah_tersedia: number | null
          penulis: string | null
          tahun_pengadaan: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          isbn?: string | null
          jenis_buku?: string | null
          judul?: string | null
          jumlah_tersedia?: number | null
          penulis?: string | null
          tahun_pengadaan?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          isbn?: string | null
          jenis_buku?: string | null
          judul?: string | null
          jumlah_tersedia?: number | null
          penulis?: string | null
          tahun_pengadaan?: number | null
        }
        Relationships: []
      }
      guru: {
        Row: {
          created_at: string | null
          id: string
          jenis_kelamin: string | null
          kelompok_mapel: string | null
          kualifikasi_pendidikan: string | null
          mata_pelajaran_id: string | null
          nama: string | null
          nip: string | null
          no_whatsapp: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          jenis_kelamin?: string | null
          kelompok_mapel?: string | null
          kualifikasi_pendidikan?: string | null
          mata_pelajaran_id?: string | null
          nama?: string | null
          nip?: string | null
          no_whatsapp?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          jenis_kelamin?: string | null
          kelompok_mapel?: string | null
          kualifikasi_pendidikan?: string | null
          mata_pelajaran_id?: string | null
          nama?: string | null
          nip?: string | null
          no_whatsapp?: string | null
        }
        Relationships: []
      }
      guru_izin: {
        Row: {
          alasan: string | null
          approved_at: string | null
          approved_by: string | null
          catatan_admin: string | null
          created_at: string | null
          guru_id: string | null
          id: string
          jenis_izin: string | null
          status: string | null
          tanggal_mulai: string | null
          tanggal_selesai: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          alasan?: string | null
          approved_at?: string | null
          approved_by?: string | null
          catatan_admin?: string | null
          created_at?: string | null
          guru_id?: string | null
          id?: string
          jenis_izin?: string | null
          status?: string | null
          tanggal_mulai?: string | null
          tanggal_selesai?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          alasan?: string | null
          approved_at?: string | null
          approved_by?: string | null
          catatan_admin?: string | null
          created_at?: string | null
          guru_id?: string | null
          id?: string
          jenis_izin?: string | null
          status?: string | null
          tanggal_mulai?: string | null
          tanggal_selesai?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      guru_izin_tugas: {
        Row: {
          created_at: string | null
          deskripsi_tugas: string | null
          file_tugas: string | null
          guru_izin_id: string | null
          id: string
          jam_ke: Json | null
          mata_pelajaran_id: string | null
          rombel_id: string | null
          tanggal: string | null
        }
        Insert: {
          created_at?: string | null
          deskripsi_tugas?: string | null
          file_tugas?: string | null
          guru_izin_id?: string | null
          id?: string
          jam_ke?: Json | null
          mata_pelajaran_id?: string | null
          rombel_id?: string | null
          tanggal?: string | null
        }
        Update: {
          created_at?: string | null
          deskripsi_tugas?: string | null
          file_tugas?: string | null
          guru_izin_id?: string | null
          id?: string
          jam_ke?: Json | null
          mata_pelajaran_id?: string | null
          rombel_id?: string | null
          tanggal?: string | null
        }
        Relationships: []
      }
      hari_efektif: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          jenis: string | null
          keterangan: string | null
          tanggal: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          jenis?: string | null
          keterangan?: string | null
          tanggal?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          jenis?: string | null
          keterangan?: string | null
          tanggal?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      jadwal_alokasi_waktu: {
        Row: {
          created_at: string | null
          created_by: string | null
          hari: string | null
          id: string
          jam_ke: number | null
          jam_mulai: string | null
          jam_selesai: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          hari?: string | null
          id?: string
          jam_ke?: number | null
          jam_mulai?: string | null
          jam_selesai?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          hari?: string | null
          id?: string
          jam_ke?: number | null
          jam_mulai?: string | null
          jam_selesai?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      jadwal_pelajaran: {
        Row: {
          created_at: string | null
          created_by: string | null
          guru_id: string | null
          hari: string | null
          id: string
          jam_ke: number | null
          jam_mulai: string | null
          jam_selesai: string | null
          mata_pelajaran_id: string | null
          rombel_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          guru_id?: string | null
          hari?: string | null
          id?: string
          jam_ke?: number | null
          jam_mulai?: string | null
          jam_selesai?: string | null
          mata_pelajaran_id?: string | null
          rombel_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          guru_id?: string | null
          hari?: string | null
          id?: string
          jam_ke?: number | null
          jam_mulai?: string | null
          jam_selesai?: string | null
          mata_pelajaran_id?: string | null
          rombel_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      kbm_agenda: {
        Row: {
          created_at: string | null
          created_by: string | null
          foto_dokumentasi: string | null
          guru_id: string | null
          guru_status: string | null
          id: string
          jam_ke: number | null
          mata_pelajaran_id: string | null
          materi_detail: string | null
          rombel_id: string | null
          semester_id: string | null
          tanggal: string | null
          ttd_guru: string | null
          tujuan_pembelajaran_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          foto_dokumentasi?: string | null
          guru_id?: string | null
          guru_status?: string | null
          id?: string
          jam_ke?: number | null
          mata_pelajaran_id?: string | null
          materi_detail?: string | null
          rombel_id?: string | null
          semester_id?: string | null
          tanggal?: string | null
          ttd_guru?: string | null
          tujuan_pembelajaran_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          foto_dokumentasi?: string | null
          guru_id?: string | null
          guru_status?: string | null
          id?: string
          jam_ke?: number | null
          mata_pelajaran_id?: string | null
          materi_detail?: string | null
          rombel_id?: string | null
          semester_id?: string | null
          tanggal?: string | null
          ttd_guru?: string | null
          tujuan_pembelajaran_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      kbm_agenda_kehadiran: {
        Row: {
          created_at: string | null
          id: string
          kbm_agenda_id: string | null
          status: string | null
          student_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          kbm_agenda_id?: string | null
          status?: string | null
          student_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          kbm_agenda_id?: string | null
          status?: string | null
          student_id?: string | null
        }
        Relationships: []
      }
      kbm_laporan: {
        Row: {
          capaian_pembelajaran: string | null
          catatan: string | null
          created_at: string
          created_by: string | null
          foto_path: string | null
          guru_id: string | null
          guru_status: string
          id: string
          jam_list: number[]
          jam_mulai: number | null
          jam_selesai: number | null
          jam_status: Json
          jumlah_alpa: number
          jumlah_hadir: number
          jumlah_izin: number
          jumlah_sakit: number
          mata_pelajaran_id: string | null
          materi: string | null
          rombel_id: string | null
          semester_id: string | null
          tanggal: string
          ttd_path: string | null
          updated_at: string
        }
        Insert: {
          capaian_pembelajaran?: string | null
          catatan?: string | null
          created_at?: string
          created_by?: string | null
          foto_path?: string | null
          guru_id?: string | null
          guru_status?: string
          id?: string
          jam_list?: number[]
          jam_mulai?: number | null
          jam_selesai?: number | null
          jam_status?: Json
          jumlah_alpa?: number
          jumlah_hadir?: number
          jumlah_izin?: number
          jumlah_sakit?: number
          mata_pelajaran_id?: string | null
          materi?: string | null
          rombel_id?: string | null
          semester_id?: string | null
          tanggal: string
          ttd_path?: string | null
          updated_at?: string
        }
        Update: {
          capaian_pembelajaran?: string | null
          catatan?: string | null
          created_at?: string
          created_by?: string | null
          foto_path?: string | null
          guru_id?: string | null
          guru_status?: string
          id?: string
          jam_list?: number[]
          jam_mulai?: number | null
          jam_selesai?: number | null
          jam_status?: Json
          jumlah_alpa?: number
          jumlah_hadir?: number
          jumlah_izin?: number
          jumlah_sakit?: number
          mata_pelajaran_id?: string | null
          materi?: string | null
          rombel_id?: string | null
          semester_id?: string | null
          tanggal?: string
          ttd_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kbm_laporan_guru_id_fkey"
            columns: ["guru_id"]
            isOneToOne: false
            referencedRelation: "guru"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kbm_laporan_mata_pelajaran_id_fkey"
            columns: ["mata_pelajaran_id"]
            isOneToOne: false
            referencedRelation: "mata_pelajaran"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kbm_laporan_rombel_id_fkey"
            columns: ["rombel_id"]
            isOneToOne: false
            referencedRelation: "rombel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kbm_laporan_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semester"
            referencedColumns: ["id"]
          },
        ]
      }
      kbm_records: {
        Row: {
          created_at: string | null
          created_by: string | null
          foto_kegiatan: string | null
          guru_id: string | null
          id: string
          jam_pelajaran: Json | null
          jam_pelajaran_status: Json | null
          mata_pelajaran_id: string | null
          rombel_id: string | null
          semester_id: string | null
          status: string | null
          tanggal: string | null
          ttd_pelapor: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          foto_kegiatan?: string | null
          guru_id?: string | null
          id?: string
          jam_pelajaran?: Json | null
          jam_pelajaran_status?: Json | null
          mata_pelajaran_id?: string | null
          rombel_id?: string | null
          semester_id?: string | null
          status?: string | null
          tanggal?: string | null
          ttd_pelapor?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          foto_kegiatan?: string | null
          guru_id?: string | null
          id?: string
          jam_pelajaran?: Json | null
          jam_pelajaran_status?: Json | null
          mata_pelajaran_id?: string | null
          rombel_id?: string | null
          semester_id?: string | null
          status?: string | null
          tanggal?: string | null
          ttd_pelapor?: string | null
        }
        Relationships: []
      }
      konsentrasi_keahlian: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string | null
          pejabat_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string | null
          pejabat_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string | null
          pejabat_id?: string | null
        }
        Relationships: []
      }
      kurator_pembelajaran: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      laporan_tpg: {
        Row: {
          bukti_transfer_url: string | null
          bulan: number | null
          created_at: string | null
          created_by: string | null
          guru_id: string | null
          id: string
          nominal_diterima: number | null
          referensi_tpg_id: string | null
          tahun: number | null
        }
        Insert: {
          bukti_transfer_url?: string | null
          bulan?: number | null
          created_at?: string | null
          created_by?: string | null
          guru_id?: string | null
          id?: string
          nominal_diterima?: number | null
          referensi_tpg_id?: string | null
          tahun?: number | null
        }
        Update: {
          bukti_transfer_url?: string | null
          bulan?: number | null
          created_at?: string | null
          created_by?: string | null
          guru_id?: string | null
          id?: string
          nominal_diterima?: number | null
          referensi_tpg_id?: string | null
          tahun?: number | null
        }
        Relationships: []
      }
      late_records: {
        Row: {
          created_at: string | null
          id: string
          record_date: string | null
          recorded_at: string | null
          recorded_by: string | null
          rombel_id: string | null
          semester_id: string | null
          student_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          record_date?: string | null
          recorded_at?: string | null
          recorded_by?: string | null
          rombel_id?: string | null
          semester_id?: string | null
          student_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          record_date?: string | null
          recorded_at?: string | null
          recorded_by?: string | null
          rombel_id?: string | null
          semester_id?: string | null
          student_id?: string | null
        }
        Relationships: []
      }
      mata_pelajaran: {
        Row: {
          created_at: string | null
          id: string
          kelompok: string | null
          kode: string | null
          nama: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          kelompok?: string | null
          kode?: string | null
          nama?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          kelompok?: string | null
          kode?: string | null
          nama?: string | null
        }
        Relationships: []
      }
      menu_layouts: {
        Row: {
          layout: Json
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          layout?: Json
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          layout?: Json
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      nilai_siswa: {
        Row: {
          catatan: string | null
          created_at: string | null
          created_by: string | null
          id: string
          nilai: number | null
          semester_id: string | null
          student_id: string | null
          tujuan_pembelajaran_id: string | null
          updated_at: string | null
        }
        Insert: {
          catatan?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          nilai?: number | null
          semester_id?: string | null
          student_id?: string | null
          tujuan_pembelajaran_id?: string | null
          updated_at?: string | null
        }
        Update: {
          catatan?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          nilai?: number | null
          semester_id?: string | null
          student_id?: string | null
          tujuan_pembelajaran_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          message: string | null
          recipient_name: string | null
          recipient_phone: string | null
          response_data: Json | null
          status: string | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          message?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          response_data?: Json | null
          status?: string | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          message?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          response_data?: Json | null
          status?: string | null
          type?: string | null
        }
        Relationships: []
      }
      persuratan_kode_surat: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          keterangan: string | null
          kode: string | null
          nama: string | null
          urutan: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          keterangan?: string | null
          kode?: string | null
          nama?: string | null
          urutan?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          keterangan?: string | null
          kode?: string | null
          nama?: string | null
          urutan?: number | null
        }
        Relationships: []
      }
      persuratan_kop_surat: {
        Row: {
          created_at: string | null
          created_by: string | null
          file_url: string | null
          id: string
          is_active: boolean | null
          nama: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          nama?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          nama?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      persuratan_nomor_diamankan: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          kode_surat: string
          nomor_urut: number
          status: string
          tanggal_diamankan: string
          updated_at: string
          used_by_surat_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          kode_surat: string
          nomor_urut: number
          status?: string
          tanggal_diamankan?: string
          updated_at?: string
          used_by_surat_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          kode_surat?: string
          nomor_urut?: number
          status?: string
          tanggal_diamankan?: string
          updated_at?: string
          used_by_surat_id?: string | null
        }
        Relationships: []
      }
      persuratan_nomor_surat: {
        Row: {
          contoh_hasil: string | null
          counter: number | null
          created_at: string | null
          created_by: string | null
          format_nomor: string | null
          id: string
          is_active: boolean | null
          jenis_surat: string | null
          prefix: string | null
          tahun: number | null
          updated_at: string | null
        }
        Insert: {
          contoh_hasil?: string | null
          counter?: number | null
          created_at?: string | null
          created_by?: string | null
          format_nomor?: string | null
          id?: string
          is_active?: boolean | null
          jenis_surat?: string | null
          prefix?: string | null
          tahun?: number | null
          updated_at?: string | null
        }
        Update: {
          contoh_hasil?: string | null
          counter?: number | null
          created_at?: string | null
          created_by?: string | null
          format_nomor?: string | null
          id?: string
          is_active?: boolean | null
          jenis_surat?: string | null
          prefix?: string | null
          tahun?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      persuratan_pengaturan_umum: {
        Row: {
          created_at: string | null
          deskripsi: string | null
          id: string
          key: string | null
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          deskripsi?: string | null
          id?: string
          key?: string | null
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          deskripsi?: string | null
          id?: string
          key?: string | null
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          default_landing_page: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          nip: string | null
          nis: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_landing_page?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          nip?: string | null
          nis?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_landing_page?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          nip?: string | null
          nis?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      referensi_tpg: {
        Row: {
          besaran_bpjs: number | null
          besaran_pajak: number | null
          created_at: string | null
          created_by: string | null
          gaji_pokok: number | null
          guru_id: string | null
          id: string
          pangkat_golongan: string | null
          updated_at: string | null
        }
        Insert: {
          besaran_bpjs?: number | null
          besaran_pajak?: number | null
          created_at?: string | null
          created_by?: string | null
          gaji_pokok?: number | null
          guru_id?: string | null
          id?: string
          pangkat_golongan?: string | null
          updated_at?: string | null
        }
        Update: {
          besaran_bpjs?: number | null
          besaran_pajak?: number | null
          created_at?: string | null
          created_by?: string | null
          gaji_pokok?: number | null
          guru_id?: string | null
          id?: string
          pangkat_golongan?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rombel: {
        Row: {
          created_at: string | null
          id: string
          is_khusus: boolean | null
          konsentrasi_keahlian: string | null
          name: string | null
          tingkat: string | null
          wali_kelas_name: string | null
          wali_kelas_nip: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_khusus?: boolean | null
          konsentrasi_keahlian?: string | null
          name?: string | null
          tingkat?: string | null
          wali_kelas_name?: string | null
          wali_kelas_nip?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_khusus?: boolean | null
          konsentrasi_keahlian?: string | null
          name?: string | null
          tingkat?: string | null
          wali_kelas_name?: string | null
          wali_kelas_nip?: string | null
        }
        Relationships: []
      }
      rombel_mata_pelajaran: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          guru_id: string | null
          id: string
          mata_pelajaran_id: string | null
          rombel_id: string | null
          semester_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          guru_id?: string | null
          id?: string
          mata_pelajaran_id?: string | null
          rombel_id?: string | null
          semester_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          guru_id?: string | null
          id?: string
          mata_pelajaran_id?: string | null
          rombel_id?: string | null
          semester_id?: string | null
        }
        Relationships: []
      }
      sarpras_jenis_ruang: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_kelas: boolean | null
          keterangan: string | null
          nama: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_kelas?: boolean | null
          keterangan?: string | null
          nama?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_kelas?: boolean | null
          keterangan?: string | null
          nama?: string | null
        }
        Relationships: []
      }
      sarpras_pengajuan: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          catatan_penolakan: string | null
          created_at: string | null
          id: string
          jenis: string | null
          keperluan: string | null
          link_referensi: string | null
          nama: string | null
          pengaju_id: string | null
          perkiraan_harga: number | null
          quantity: number | null
          satuan: string | null
          status: string | null
          total_harga: number | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          catatan_penolakan?: string | null
          created_at?: string | null
          id?: string
          jenis?: string | null
          keperluan?: string | null
          link_referensi?: string | null
          nama?: string | null
          pengaju_id?: string | null
          perkiraan_harga?: number | null
          quantity?: number | null
          satuan?: string | null
          status?: string | null
          total_harga?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          catatan_penolakan?: string | null
          created_at?: string | null
          id?: string
          jenis?: string | null
          keperluan?: string | null
          link_referensi?: string | null
          nama?: string | null
          pengaju_id?: string | null
          perkiraan_harga?: number | null
          quantity?: number | null
          satuan?: string | null
          status?: string | null
          total_harga?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sarpras_ruang: {
        Row: {
          created_at: string | null
          created_by: string | null
          denah_marker_size: number | null
          denah_posisi_x: number | null
          denah_posisi_y: number | null
          id: string
          jenis_ruang_id: string | null
          kapasitas: number | null
          kode_ruang: string | null
          nama: string | null
          rombel_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          denah_marker_size?: number | null
          denah_posisi_x?: number | null
          denah_posisi_y?: number | null
          id?: string
          jenis_ruang_id?: string | null
          kapasitas?: number | null
          kode_ruang?: string | null
          nama?: string | null
          rombel_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          denah_marker_size?: number | null
          denah_posisi_x?: number | null
          denah_posisi_y?: number | null
          id?: string
          jenis_ruang_id?: string | null
          kapasitas?: number | null
          kode_ruang?: string | null
          nama?: string | null
          rombel_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      semester: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          nama: string | null
          tahun_ajaran_id: string | null
          tanggal_mulai: string | null
          tanggal_selesai: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          nama?: string | null
          tahun_ajaran_id?: string | null
          tanggal_mulai?: string | null
          tanggal_selesai?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          nama?: string | null
          tahun_ajaran_id?: string | null
          tanggal_mulai?: string | null
          tanggal_selesai?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sp_records: {
        Row: {
          alasan: string | null
          created_at: string | null
          created_by: string | null
          dokumen_pendukung: string | null
          foto_kegiatan: string | null
          id: string
          jumlah_alfa: number | null
          jumlah_terlambat: number | null
          sp_level: number | null
          student_id: string | null
          tanggal_rekaman: string | null
        }
        Insert: {
          alasan?: string | null
          created_at?: string | null
          created_by?: string | null
          dokumen_pendukung?: string | null
          foto_kegiatan?: string | null
          id?: string
          jumlah_alfa?: number | null
          jumlah_terlambat?: number | null
          sp_level?: number | null
          student_id?: string | null
          tanggal_rekaman?: string | null
        }
        Update: {
          alasan?: string | null
          created_at?: string | null
          created_by?: string | null
          dokumen_pendukung?: string | null
          foto_kegiatan?: string | null
          id?: string
          jumlah_alfa?: number | null
          jumlah_terlambat?: number | null
          sp_level?: number | null
          student_id?: string | null
          tanggal_rekaman?: string | null
        }
        Relationships: []
      }
      student_promotions: {
        Row: {
          batch_id: string
          catatan: string | null
          created_at: string
          created_by: string | null
          id: string
          rombel_asal_id: string | null
          rombel_asal_name: string | null
          rombel_tujuan_id: string | null
          rombel_tujuan_name: string | null
          semester_asal_id: string | null
          semester_tujuan_id: string | null
          status: Database["public"]["Enums"]["promotion_status"]
          student_id: string | null
          student_name: string | null
          student_nis: string | null
          tahun_ajaran_asal_id: string | null
          tahun_ajaran_tujuan_id: string | null
          tanggal_proses: string
          updated_at: string
        }
        Insert: {
          batch_id: string
          catatan?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          rombel_asal_id?: string | null
          rombel_asal_name?: string | null
          rombel_tujuan_id?: string | null
          rombel_tujuan_name?: string | null
          semester_asal_id?: string | null
          semester_tujuan_id?: string | null
          status: Database["public"]["Enums"]["promotion_status"]
          student_id?: string | null
          student_name?: string | null
          student_nis?: string | null
          tahun_ajaran_asal_id?: string | null
          tahun_ajaran_tujuan_id?: string | null
          tanggal_proses?: string
          updated_at?: string
        }
        Update: {
          batch_id?: string
          catatan?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          rombel_asal_id?: string | null
          rombel_asal_name?: string | null
          rombel_tujuan_id?: string | null
          rombel_tujuan_name?: string | null
          semester_asal_id?: string | null
          semester_tujuan_id?: string | null
          status?: Database["public"]["Enums"]["promotion_status"]
          student_id?: string | null
          student_name?: string | null
          student_nis?: string | null
          tahun_ajaran_asal_id?: string | null
          tahun_ajaran_tujuan_id?: string | null
          tanggal_proses?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_resignations: {
        Row: {
          alasan: string | null
          created_at: string | null
          created_by: string | null
          dapodik_status: string | null
          dapodik_tanggal: string | null
          file_surat: string | null
          id: string
          rombel_id: string | null
          student_id: string | null
          student_name: string | null
          student_nis: string | null
          tanggal_surat: string | null
        }
        Insert: {
          alasan?: string | null
          created_at?: string | null
          created_by?: string | null
          dapodik_status?: string | null
          dapodik_tanggal?: string | null
          file_surat?: string | null
          id?: string
          rombel_id?: string | null
          student_id?: string | null
          student_name?: string | null
          student_nis?: string | null
          tanggal_surat?: string | null
        }
        Update: {
          alasan?: string | null
          created_at?: string | null
          created_by?: string | null
          dapodik_status?: string | null
          dapodik_tanggal?: string | null
          file_surat?: string | null
          id?: string
          rombel_id?: string | null
          student_id?: string | null
          student_name?: string | null
          student_nis?: string | null
          tanggal_surat?: string | null
        }
        Relationships: []
      }
      student_rombel_transfers: {
        Row: {
          alasan: string | null
          created_at: string | null
          created_by: string | null
          dapodik_status: string | null
          dapodik_tanggal: string | null
          id: string
          rombel_asal_id: string | null
          rombel_tujuan_id: string | null
          student_id: string | null
          tanggal_pindah: string | null
        }
        Insert: {
          alasan?: string | null
          created_at?: string | null
          created_by?: string | null
          dapodik_status?: string | null
          dapodik_tanggal?: string | null
          id?: string
          rombel_asal_id?: string | null
          rombel_tujuan_id?: string | null
          student_id?: string | null
          tanggal_pindah?: string | null
        }
        Update: {
          alasan?: string | null
          created_at?: string | null
          created_by?: string | null
          dapodik_status?: string | null
          dapodik_tanggal?: string | null
          id?: string
          rombel_asal_id?: string | null
          rombel_tujuan_id?: string | null
          student_id?: string | null
          tanggal_pindah?: string | null
        }
        Relationships: []
      }
      student_transfers_out: {
        Row: {
          created_at: string | null
          created_by: string | null
          dapodik_status: string | null
          dapodik_tanggal: string | null
          file_surat: string | null
          id: string
          rombel_id: string | null
          sekolah_tujuan: string | null
          student_id: string | null
          student_name: string | null
          student_nis: string | null
          tanggal_diterima_tujuan: string | null
          tanggal_surat_pindah: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dapodik_status?: string | null
          dapodik_tanggal?: string | null
          file_surat?: string | null
          id?: string
          rombel_id?: string | null
          sekolah_tujuan?: string | null
          student_id?: string | null
          student_name?: string | null
          student_nis?: string | null
          tanggal_diterima_tujuan?: string | null
          tanggal_surat_pindah?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          dapodik_status?: string | null
          dapodik_tanggal?: string | null
          file_surat?: string | null
          id?: string
          rombel_id?: string | null
          sekolah_tujuan?: string | null
          student_id?: string | null
          student_name?: string | null
          student_nis?: string | null
          tanggal_diterima_tujuan?: string | null
          tanggal_surat_pindah?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          created_at: string | null
          gender: string | null
          id: string
          name: string | null
          nis: string | null
          nisn: string | null
          rombel_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          gender?: string | null
          id?: string
          name?: string | null
          nis?: string | null
          nisn?: string | null
          rombel_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          gender?: string | null
          id?: string
          name?: string | null
          nis?: string | null
          nisn?: string | null
          rombel_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      suara_publik: {
        Row: {
          created_at: string | null
          email_pengirim: string | null
          id: string
          is_anonymous: boolean | null
          isi: string | null
          judul: string | null
          kategori: string | null
          moderated_at: string | null
          moderated_by: string | null
          nama_pengirim: string | null
          peran_pengirim: string | null
          status: string | null
          tanggapan_admin: string | null
          token: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email_pengirim?: string | null
          id?: string
          is_anonymous?: boolean | null
          isi?: string | null
          judul?: string | null
          kategori?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          nama_pengirim?: string | null
          peran_pengirim?: string | null
          status?: string | null
          tanggapan_admin?: string | null
          token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email_pengirim?: string | null
          id?: string
          is_anonymous?: boolean | null
          isi?: string | null
          judul?: string | null
          kategori?: string | null
          moderated_at?: string | null
          moderated_by?: string | null
          nama_pengirim?: string | null
          peran_pengirim?: string | null
          status?: string | null
          tanggapan_admin?: string | null
          token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      surat_keluar: {
        Row: {
          created_at: string | null
          file_url: string | null
          id: string
          isi_ringkas: string | null
          jenis_surat: string | null
          kode_surat: string | null
          nomor_surat: string | null
          nomor_urut: number | null
          pembuat_id: string | null
          penandatangan_id: string | null
          perihal: string | null
          sifat_surat: string | null
          status: string | null
          tanggal_surat: string | null
          tujuan: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          file_url?: string | null
          id?: string
          isi_ringkas?: string | null
          jenis_surat?: string | null
          kode_surat?: string | null
          nomor_surat?: string | null
          nomor_urut?: number | null
          pembuat_id?: string | null
          penandatangan_id?: string | null
          perihal?: string | null
          sifat_surat?: string | null
          status?: string | null
          tanggal_surat?: string | null
          tujuan?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          file_url?: string | null
          id?: string
          isi_ringkas?: string | null
          jenis_surat?: string | null
          kode_surat?: string | null
          nomor_surat?: string | null
          nomor_urut?: number | null
          pembuat_id?: string | null
          penandatangan_id?: string | null
          perihal?: string | null
          sifat_surat?: string | null
          status?: string | null
          tanggal_surat?: string | null
          tujuan?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      surat_tugas: {
        Row: {
          created_at: string | null
          dasar_surat_ada: boolean | null
          file_sppd_url: string | null
          file_surat_tugas_url: string | null
          id: string
          instansi_dasar_surat: string | null
          jenis: string | null
          kendaraan: string | null
          keperluan: string | null
          kode_kegiatan: string | null
          kode_ring: string | null
          nomor_dasar_surat: string | null
          nomor_surat: string | null
          pembuat_id: string | null
          perihal_dasar_surat: string | null
          status: string | null
          tanggal_dasar_surat: string | null
          tanggal_mulai: string | null
          tanggal_selesai: string | null
          tujuan_lokasi: string | null
          updated_at: string | null
          waktu_berangkat: string | null
        }
        Insert: {
          created_at?: string | null
          dasar_surat_ada?: boolean | null
          file_sppd_url?: string | null
          file_surat_tugas_url?: string | null
          id?: string
          instansi_dasar_surat?: string | null
          jenis?: string | null
          kendaraan?: string | null
          keperluan?: string | null
          kode_kegiatan?: string | null
          kode_ring?: string | null
          nomor_dasar_surat?: string | null
          nomor_surat?: string | null
          pembuat_id?: string | null
          perihal_dasar_surat?: string | null
          status?: string | null
          tanggal_dasar_surat?: string | null
          tanggal_mulai?: string | null
          tanggal_selesai?: string | null
          tujuan_lokasi?: string | null
          updated_at?: string | null
          waktu_berangkat?: string | null
        }
        Update: {
          created_at?: string | null
          dasar_surat_ada?: boolean | null
          file_sppd_url?: string | null
          file_surat_tugas_url?: string | null
          id?: string
          instansi_dasar_surat?: string | null
          jenis?: string | null
          kendaraan?: string | null
          keperluan?: string | null
          kode_kegiatan?: string | null
          kode_ring?: string | null
          nomor_dasar_surat?: string | null
          nomor_surat?: string | null
          pembuat_id?: string | null
          perihal_dasar_surat?: string | null
          status?: string | null
          tanggal_dasar_surat?: string | null
          tanggal_mulai?: string | null
          tanggal_selesai?: string | null
          tujuan_lokasi?: string | null
          updated_at?: string | null
          waktu_berangkat?: string | null
        }
        Relationships: []
      }
      surat_tugas_peserta: {
        Row: {
          created_at: string | null
          id: string
          is_utama: boolean | null
          jabatan: string | null
          nama_peserta: string | null
          nip: string | null
          pangkat_golongan: string | null
          surat_tugas_id: string | null
          urutan: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_utama?: boolean | null
          jabatan?: string | null
          nama_peserta?: string | null
          nip?: string | null
          pangkat_golongan?: string | null
          surat_tugas_id?: string | null
          urutan?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_utama?: boolean | null
          jabatan?: string | null
          nama_peserta?: string | null
          nip?: string | null
          pangkat_golongan?: string | null
          surat_tugas_id?: string | null
          urutan?: number | null
        }
        Relationships: []
      }
      tahun_ajaran: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          nama: string | null
          tanggal_mulai: string | null
          tanggal_selesai: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          nama?: string | null
          tanggal_mulai?: string | null
          tanggal_selesai?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          nama?: string | null
          tanggal_mulai?: string | null
          tanggal_selesai?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tpg_administrasi: {
        Row: {
          bulan: number | null
          created_at: string | null
          created_by: string | null
          guru_id: string | null
          id: string
          laporan_tpg_id: string | null
          nominal_iuran: number | null
          sudah_administrasi: boolean | null
          tahun: number | null
          tanggal_administrasi: string | null
          updated_at: string | null
        }
        Insert: {
          bulan?: number | null
          created_at?: string | null
          created_by?: string | null
          guru_id?: string | null
          id?: string
          laporan_tpg_id?: string | null
          nominal_iuran?: number | null
          sudah_administrasi?: boolean | null
          tahun?: number | null
          tanggal_administrasi?: string | null
          updated_at?: string | null
        }
        Update: {
          bulan?: number | null
          created_at?: string | null
          created_by?: string | null
          guru_id?: string | null
          id?: string
          laporan_tpg_id?: string | null
          nominal_iuran?: number | null
          sudah_administrasi?: boolean | null
          tahun?: number | null
          tanggal_administrasi?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tpg_penyerahan_iuran: {
        Row: {
          bulan: number | null
          created_at: string | null
          created_by: string | null
          id: string
          keperluan: string | null
          nominal: number | null
          tahun: number | null
          tanggal_penyerahan: string | null
        }
        Insert: {
          bulan?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          keperluan?: string | null
          nominal?: number | null
          tahun?: number | null
          tanggal_penyerahan?: string | null
        }
        Update: {
          bulan?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          keperluan?: string | null
          nominal?: number | null
          tahun?: number | null
          tanggal_penyerahan?: string | null
        }
        Relationships: []
      }
      tpg_periode_aktif: {
        Row: {
          bulan: number | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          tahun: number | null
        }
        Insert: {
          bulan?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          tahun?: number | null
        }
        Update: {
          bulan?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          tahun?: number | null
        }
        Relationships: []
      }
      tujuan_pembelajaran: {
        Row: {
          bobot: number | null
          created_at: string | null
          created_by: string | null
          deskripsi: string | null
          id: string
          is_active: boolean | null
          kode_tp: string | null
          komponen_type: string | null
          model_penilaian: string | null
          rombel_mata_pelajaran_id: string | null
          semester_id: string | null
          tanggal_rencana_penilaian: string | null
          updated_at: string | null
          urutan: number | null
        }
        Insert: {
          bobot?: number | null
          created_at?: string | null
          created_by?: string | null
          deskripsi?: string | null
          id?: string
          is_active?: boolean | null
          kode_tp?: string | null
          komponen_type?: string | null
          model_penilaian?: string | null
          rombel_mata_pelajaran_id?: string | null
          semester_id?: string | null
          tanggal_rencana_penilaian?: string | null
          updated_at?: string | null
          urutan?: number | null
        }
        Update: {
          bobot?: number | null
          created_at?: string | null
          created_by?: string | null
          deskripsi?: string | null
          id?: string
          is_active?: boolean | null
          kode_tp?: string | null
          komponen_type?: string | null
          model_penilaian?: string | null
          rombel_mata_pelajaran_id?: string | null
          semester_id?: string | null
          tanggal_rencana_penilaian?: string | null
          updated_at?: string | null
          urutan?: number | null
        }
        Relationships: []
      }
      user_menu_permissions: {
        Row: {
          created_at: string | null
          id: string
          menu_key: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          menu_key?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          menu_key?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          created_at: string | null
          id: string
          is_online: boolean | null
          last_seen_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_online?: boolean | null
          last_seen_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_online?: boolean | null
          last_seen_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_rombel: {
        Row: {
          created_at: string | null
          id: string
          rombel_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          rombel_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          rombel_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      verval_siswa: {
        Row: {
          agama: string | null
          akte_kelahiran_url: string | null
          catatan_perbaikan: string | null
          created_at: string | null
          created_by: string | null
          data_perbaikan: Json | null
          id: string
          ijazah_sd_url: string | null
          ijazah_smp_url: string | null
          kk_url: string | null
          nama_ayah: string | null
          nama_ibu: string | null
          nama_perbaikan: string | null
          nisn: string | null
          semester_id: string | null
          status: string | null
          student_id: string | null
          tanggal_lahir: string | null
          tempat_lahir: string | null
          updated_at: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          agama?: string | null
          akte_kelahiran_url?: string | null
          catatan_perbaikan?: string | null
          created_at?: string | null
          created_by?: string | null
          data_perbaikan?: Json | null
          id?: string
          ijazah_sd_url?: string | null
          ijazah_smp_url?: string | null
          kk_url?: string | null
          nama_ayah?: string | null
          nama_ibu?: string | null
          nama_perbaikan?: string | null
          nisn?: string | null
          semester_id?: string | null
          status?: string | null
          student_id?: string | null
          tanggal_lahir?: string | null
          tempat_lahir?: string | null
          updated_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          agama?: string | null
          akte_kelahiran_url?: string | null
          catatan_perbaikan?: string | null
          created_at?: string | null
          created_by?: string | null
          data_perbaikan?: Json | null
          id?: string
          ijazah_sd_url?: string | null
          ijazah_smp_url?: string | null
          kk_url?: string | null
          nama_ayah?: string | null
          nama_ibu?: string | null
          nama_perbaikan?: string | null
          nisn?: string | null
          semester_id?: string | null
          status?: string | null
          student_id?: string | null
          tanggal_lahir?: string | null
          tempat_lahir?: string | null
          updated_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "wakasek"
        | "kaprog"
        | "guru"
        | "murid"
        | "admin_sarpras"
        | "admin_persuratan"
        | "admin_tpg"
      promotion_status: "naik" | "tinggal" | "lulus" | "keluar"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "wakasek",
        "kaprog",
        "guru",
        "murid",
        "admin_sarpras",
        "admin_persuratan",
        "admin_tpg",
      ],
      promotion_status: ["naik", "tinggal", "lulus", "keluar"],
    },
  },
} as const

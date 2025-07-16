import { Component } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  template: `
    <div class="container">
      <h1>Marathi/Hindi to English Translator</h1>
      
      <div class="controls">
        <p *ngIf="!isRecording" style="color: #666; margin-bottom: 15px;">
          Tap "Start Recording" and allow microphone access
        </p>
        <button (click)="startRecording()" [disabled]="isRecording">
          {{isRecording ? '🎤 Recording...' : '🎤 Start Recording'}}
        </button>
        <button (click)="stopRecording()" [disabled]="!isRecording">
          ⏹️ Stop Recording
        </button>
      </div>
      
      <div *ngIf="originalText" class="result">
        <h3>Original Text:</h3>
        <p>{{originalText}}</p>
      </div>
      
      <div *ngIf="translatedText" class="result">
        <h3>English Translation:</h3>
        <p>{{translatedText}}</p>
        <button (click)="playAudio()" [disabled]="!audioData">Play English Audio</button>
      </div>
      
      <div *ngIf="isLoading" class="loading">
        Processing...
      </div>
    </div>
  `,
  styles: [`
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .controls { margin: 20px 0; text-align: center; }
    button { 
      margin: 10px; 
      padding: 15px 25px; 
      font-size: 18px; 
      min-height: 50px;
      touch-action: manipulation;
    }
    .result { margin: 20px 0; padding: 15px; border: 1px solid #ccc; }
    .loading { text-align: center; font-size: 18px; }
    @media (max-width: 768px) {
      button { width: 90%; margin: 5px 0; }
    }
  `]
})
export class AppComponent {
  isRecording = false;
  isLoading = false;
  originalText = '';
  translatedText = '';
  audioData = '';
  mediaRecorder: MediaRecorder | null = null;
  audioChunks: Blob[] = [];

  constructor(private http: HttpClient) {}

  async startRecording() {
    try {
      // Check if running on HTTPS or localhost
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        alert('Microphone requires HTTPS. Please use HTTPS or localhost.');
        return;
      }

      // Simple audio request for mobile compatibility
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Use basic MIME type for mobile compatibility
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      
      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        this.processAudio();
      };
      
      this.mediaRecorder.start();
      this.isRecording = true;
    } catch (error: any) {
      console.error('Microphone error:', error);
      if (error.name === 'NotAllowedError') {
        alert('Please allow microphone access and try again.');
      } else if (error.name === 'NotFoundError') {
        alert('No microphone found on this device.');
      } else {
        alert('Cannot access microphone. Try refreshing the page.');
      }
    }
  }

  stopRecording() {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.isRecording = false;
    }
  }

  processAudio() {
    if (this.audioChunks.length === 0) {
      alert('No audio recorded');
      return;
    }
    
    const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
    const audioBlob = new Blob(this.audioChunks, { type: mimeType });
    const formData = new FormData();
    
    // Determine file extension based on MIME type
    let fileName = 'recording.webm';
    if (mimeType.includes('mp4')) fileName = 'recording.mp4';
    if (mimeType.includes('wav')) fileName = 'recording.wav';
    
    formData.append('audio', audioBlob, fileName);
    
    this.isLoading = true;
    
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const apiUrl = `${protocol}//${hostname}:3000`;
    this.http.post<any>(`${apiUrl}/translate-audio`, formData)
      .subscribe({
        next: (response) => {
          this.originalText = response.originalText;
          this.translatedText = response.translatedText;
          this.audioData = response.audioBase64;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Translation error:', error);
          alert('Translation failed. Please try again.');
          this.isLoading = false;
        }
      });
  }

  playAudio() {
    if (this.audioData) {
      const audio = new Audio(`data:audio/mpeg;base64,${this.audioData}`);
      audio.play();
    }
  }
}
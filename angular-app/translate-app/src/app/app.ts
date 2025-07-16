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
  recognition: any = null;

  constructor(private http: HttpClient) {}

  async startRecording() {
    try {
      // Check if running on HTTPS or localhost
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        alert('Microphone requires HTTPS. Please use HTTPS or localhost.');
        return;
      }

      // Use Web Speech API instead of file upload
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'hi-IN'; // Hindi
        
        this.recognition.onstart = () => {
          this.isRecording = true;
          console.log('Speech recognition started');
        };
        
        this.recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          console.log('Speech recognized:', transcript);
          this.originalText = transcript;
          this.translateText(transcript);
        };
        
        this.recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          this.isRecording = false;
          alert('Speech recognition failed: ' + event.error);
        };
        
        this.recognition.onend = () => {
          this.isRecording = false;
          console.log('Speech recognition ended');
        };
        
        this.recognition.start();
      } else {
        alert('Speech recognition not supported in this browser');
      }
    } catch (error: any) {
      console.error('Speech recognition error:', error);
      alert('Cannot start speech recognition');
    }
  }

  stopRecording() {
    if (this.recognition) {
      this.recognition.stop();
      this.isRecording = false;
    }
  }

  translateText(text: string) {
    this.isLoading = true;
    
    this.http.post<any>('/translate-text', { text })
      .subscribe({
        next: (response: any) => {
          this.translatedText = response.translatedText;
          this.audioData = response.audioBase64;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Translation error:', error);
          alert('Translation failed: ' + (error.error?.error || 'Please try again'));
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
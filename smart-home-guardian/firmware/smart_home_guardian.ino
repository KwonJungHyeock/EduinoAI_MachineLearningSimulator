/*
  SMART HOME GUARDIAN — ESP32 펌웨어
  - 50ms 주기로 센서를 읽어 "S:temp=..,humi=..,flame=..,pir=..,light=..\n" 송신 (115200)
  - 시리얼 수신 "C:NAME:VAL" 파싱 → 액추에이터 구동 (FAN/BUZZER/LED/SERVO/LCD)

  ⚠ 핀 번호는 키트 매뉴얼(product_no=9975)로 반드시 확인 후 아래 PIN MAP만 교체하세요.
  필요 라이브러리: DHT sensor library, ESP32Servo, LiquidCrystal_I2C
*/

#include <DHT.h>
#include <ESP32Servo.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// === PIN MAP (키트 매뉴얼로 교체) ============================
#define PIN_DHT     4     // DHT11 데이터
#define PIN_FLAME   34    // 불꽃/가스 센서 (아날로그 입력 전용 핀)
#define PIN_PIR     27    // PIR 인체감지
#define PIN_CDS     35    // 조도(CDS) 아날로그
#define PIN_FAN     25    // DC 팬 (트랜지스터/모듈)
#define PIN_BUZZER  26    // 부저
#define PIN_LED     2     // LED
#define PIN_SERVO   13    // 서보(SG90)
#define LCD_ADDR    0x27  // 1602 I2C 주소 (0x3F일 수 있음)
// ============================================================

#define DHTTYPE DHT11
DHT dht(PIN_DHT, DHTTYPE);
Servo doorServo;
LiquidCrystal_I2C lcd(LCD_ADDR, 16, 2);

unsigned long lastSend = 0;
String rx = "";

void setup() {
  Serial.begin(115200);
  dht.begin();
  pinMode(PIN_PIR, INPUT);
  pinMode(PIN_FAN, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED, OUTPUT);
  doorServo.attach(PIN_SERVO);
  doorServo.write(0);
  Wire.begin();
  lcd.init();
  lcd.backlight();
  lcd.print("GUARDIAN READY");
}

void loop() {
  // 수신 처리
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') { handleCommand(rx); rx = ""; }
    else if (c != '\r') rx += c;
  }

  // 50ms 주기 센서 송신
  if (millis() - lastSend >= 50) {
    lastSend = millis();
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (isnan(t)) t = 24;
    if (isnan(h)) h = 50;
    int flame = (analogRead(PIN_FLAME) < 1500) ? 1 : 0; // 불꽃 감지 시 낮은 값(센서별 반전 가능)
    int pir = digitalRead(PIN_PIR);
    int light = map(analogRead(PIN_CDS), 0, 4095, 0, 1000);

    Serial.print("S:temp="); Serial.print((int)t);
    Serial.print(",humi="); Serial.print((int)h);
    Serial.print(",flame="); Serial.print(flame);
    Serial.print(",pir="); Serial.print(pir);
    Serial.print(",light="); Serial.print(light);
    Serial.print("\n");
  }
}

void handleCommand(String s) {
  if (!s.startsWith("C:")) return;
  s = s.substring(2);
  int colon = s.indexOf(':');
  String name = (colon >= 0) ? s.substring(0, colon) : s;
  String val = (colon >= 0) ? s.substring(colon + 1) : "";

  if (name == "FAN")        digitalWrite(PIN_FAN, val == "1" ? HIGH : LOW);
  else if (name == "BUZZER") digitalWrite(PIN_BUZZER, val == "1" ? HIGH : LOW);
  else if (name == "LED")    digitalWrite(PIN_LED, val == "1" ? HIGH : LOW);
  else if (name == "SERVO")  doorServo.write(constrain(val.toInt(), 0, 180));
  else if (name == "LCD") {
    lcd.clear();
    lcd.print(val.substring(0, 16));
  }
}

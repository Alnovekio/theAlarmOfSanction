#include <ESP8266.h>
#include <DS3231.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Servo.h>
#include <SD.h>            //Arduino SD库
#include <TMRpcm.h>        //音频播放库 （支持wav和pcm）
#include <SPI.h>           //SD卡的SPI库
#define SD_ChipSelectPin 8 //将芯片选择（CS引脚）定义到D8
TMRpcm music;              //创建音乐播放对象music

/**
**Core UART Port: [SoftSerial] [D2,D3]
**/
#include <SoftwareSerial.h>
SoftwareSerial mySerial(4, 6); /* RX:D2, TX:D3 */
LiquidCrystal_I2C lcd(0x27, 16, 2);

#define EspSerial mySerial
#define UARTSPEED 9600

#define SSID F("Nokia X7")            //你手机热点的名字，确认工作在2.4Ghz频段
#define PASSWORD F("7879879123")      //你手机热点对应的密码
#define HOST_NAME F("188.131.199.14") //这个是你要访问的主机的地址
#define HOST_PORT (8081)              //端口号

DS3231 rtc(A4, A5);       // 创建实时时钟DS3231对象
Servo myservo;            // 创建一个舵机对象
int pos = 0;              // 变量pos用来存储舵机位置
ESP8266 wifi(&EspSerial); // 实例化ESP8266对象

/**************保存全局变量**************/
int aHour = 0, aMinute = 0;                                                          //储存服务器传来的最近闹钟时间
int sYear = 0, sMonth = 0, sDate = 0, sHour = 0, sMinute = 0, sSecond = 0, sDay = 0; //储存服务器传来的校准时间
int counter = 0, counterT = 0, touchCounter = 0, Press = 0, light = 99;              //计数用变量
bool buzzer = 0, ifDelay = 0, LCDSwitch = 0;
long RandomNumber;
String text;

void timesplit(char t[5])
{
    if (t[0] != '0')
        aHour = 10 * (t[0] - '0');
    aHour += t[1] - '0';

    if (t[2] != '0')
        aMinute = 10 * (t[2] - '0');
    aMinute += t[3] - '0';
}

void datesplit(char t[13])
{
    if (t[0] != '0')
        sYear = 10 * (t[0] - '0');
    sYear += t[1] - '0' + 2000;

    if (t[2] != '0')
        sMonth = 10 * (t[2] - '0');
    sMonth += t[3] - '0';

    if (t[4] != '0')
        sDate = 10 * (t[4] - '0');
    sDate += t[5] - '0';

    if (t[6] != '0')
        sHour = 10 * (t[6] - '0');
    sHour += t[7] - '0';

    if (t[8] != '0')
        sMinute = 10 * (t[8] - '0');
    sMinute += t[9] - '0';

    if (t[10] != '0')
        sSecond = 10 * (t[10] - '0');
    sSecond += t[11] - '0';

    sDay += t[12] - '0' + 1;
}

void Set() //写入函数，将时间写入DS1302，用于校准
{
    Serial.println(sHour);
    Serial.println(sMinute);
    Serial.println(sSecond);
    rtc.setDOW(sDay);
    rtc.setTime(sHour, sMinute, sSecond);
    rtc.setDate(sDate, sMonth, sYear);
}

void ringABell()
{
    music.play("1.wav", 1);//播放SD卡内的音乐，从第1秒开始
    int checkCounter, j;
    for (int i = 0; i < 60; i++)
    {
        checkCounter = 0;
        j = 0;
        for (pos = 0; pos < 100; pos += 5)
        {                       //舵机从0°转到180°，每次增加1°
            myservo.write(pos); //给舵机写入角度
            checkCounter++;
            if (digitalRead(2))
                j++;
            delay(75);          //延时15ms让舵机转到指定位置
        }
        for (pos = 100; pos >= 1; pos -= 5)
        {                       //舵机从0°转到180°，每次增加1°
            myservo.write(pos); //给舵机写入角度
            checkCounter++;
            delay(20);
            if (digitalRead(2))
                j++;
            delay(55); //延时15ms让舵机转到指定位置
        }
        if (j <= 10)
        {
            music.pause();
            return;
        }
    }
    music.pause();
    while (true)
    {
        checkCounter = 0;
        j = 0;
        for (pos = 0; pos < 100; pos += 5)
        {                       //舵机从0°转到100°，每次增加5°
            myservo.write(pos); //给舵机写入角度
            checkCounter++;
            delay(20);
            if (digitalRead(2))
                j++;
            delay(55);          //延时15ms让舵机转到指定位置
        }
        for (pos = 100; pos >= 1; pos -= 5)
        {                       //舵机从100°转到0°，每次减少5°
            myservo.write(pos); //给舵机写入角度
            checkCounter++;
            delay(20);
            if (digitalRead(2))
                j++;
            delay(55); //延时15ms让舵机转到指定位置
        }
        if (j <= 10)
        {
            analogWrite(3, 0);
            return;
        }
        randomNoise();
    }
}

void PIRCheck()
{
    bool IR[3] = {0};
    int checkCounter, j;
    for (int i = 0; i < 3; i++)
    {
        checkCounter = 0;
        j = 0;
        while (true)
        {
            for (pos = 0; pos < 100; pos += 5)
            {                       //舵机从0°转到100°，每次增加5°
                myservo.write(pos); //给舵机写入角度
                checkCounter++;
                delay(20);
                if (digitalRead(2))
                    j++;
                delay(55);          //延时15ms让舵机转到指定位置
            }
            for (pos = 100; pos >= 1; pos -= 5)
            {                       //舵机从100°转回0°，每次减少5°
                myservo.write(pos); //给舵机写入角度
                checkCounter++;
                delay(20);
                if (digitalRead(2))
                    j++;
                delay(55); //延时15ms让舵机转到指定位置
            }
            if (checkCounter >= 100)
                break;
        }
        if (j > 75)
            IR[i] = true;
    }

    for (int i = 0; i < 3; i++)
    {
        if (IR[i] == false)
            break;
        if (i == 2)
        {
            httpRequest(2);
            ringABell();
        }
    }
    ifDelay = true;
}

bool timeCheck() //从DS1302中获取时间，与当前设定的闹钟时间比较
{
    Time t = rtc.getTime();
    if (t.hour == aHour)
    {
        if (t.min == aMinute - 1)
        {
            return 1;
        }
    }
    return 0;
}

void randomNoise()
{
    RandomNumber = random(512, 1024);
    analogWrite(3, RandomNumber);
}

void httpRequest(int method)
{
    uint8_t buffer[400] = {0}; //定义一个缓存空间，用以存放HTTP Response

    if (wifi.createTCP(HOST_NAME, HOST_PORT))
    { //建立TCP请求
        Serial.print("create tcp ok\r\n");
    }
    else
    {
        Serial.print("create tcp err\r\n");
    }
    if (method == 0)
    {
        char *hello = "GET /NearestAlarm HTTP/1.1\r\nHost: 188.131.199.14:8081\r\nConnection: close\r\n\r\n"; //通过HTTP GET方法访问服务器
        wifi.send((const uint8_t *)hello, strlen(hello));                                                     //向服务器发起Http请求
    }
    else if (method == 1)
    {
        char *hello = "GET /TimeCorrect HTTP/1.1\r\nHost: 188.131.199.14:8081\r\nConnection: close\r\n\r\n"; //通过HTTP GET方法访问服务器
        wifi.send((const uint8_t *)hello, strlen(hello));                                                    //向服务器发起Http请求
    }
    else if (method == 2)
    {
        char *hello = "GET /WakeUp?1 HTTP/1.1\r\nHost: 188.131.199.14:8081\r\nConnection: close\r\n\r\n"; //通过HTTP GET方法访问服务器
        wifi.send((const uint8_t *)hello, strlen(hello));
    }
    else
    {
        char *hello = "GET /TTS HTTP/1.1\r\nHost: 188.131.199.14:8081\r\nConnection: close\r\n\r\n"; //通过HTTP GET方法访问服务器
        wifi.send((const uint8_t *)hello, strlen(hello));
    }

    uint32_t len = wifi.recv(buffer, sizeof(buffer), 10000); //服务器返回的内容长度，10000是超时时间
    if (len > 0)
    {
        Serial.print("Received:[");
        for (uint32_t i = 0; i < len; i++)
        {
            Serial.print((char)buffer[i]); //显示服务器返回内容
        }
        Serial.print("]\r\n");
    }

    if (method == 0)
    {
        char change = buffer[len - 1];
        if (change == 'H')
        {
            Serial.println("我叫高恒我最叼");
        }
        else
        {
            char t[5];
            for (int i = 0; i < 4; i++)
            {
                t[i] = buffer[len - 4 + i]; //获取返回时间
            }
            timesplit(t);
        }
    }
    else if (method == 1)
    {
        char t[13];
        for (int i = 0; i < 13; i++)
        {
            t[i] = buffer[len - 13 + i]; //获取返回的服务器标准时间
        }
        datesplit(t); //分离服务器返回的数据
        Set();        //将分离的数据写入DS1302中
    }

    if (wifi.releaseTCP())
    {
        Serial.print("release tcp err\r\n");
    }
    else
    {
        Serial.print("release tcp ok\r\n");
    }
}

void LCDText()
{
    String Str1 = rtc.getDateStr(FORMAT_SHORT, FORMAT_MIDDLEENDIAN, '-');
    Str1.remove(5);
    String Str2 = String(rtc.getTemp());
    Str2.remove(4);
    text = Str1 + " Temp:" + Str2 + "C";
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(text);
    lcd.setCursor(4, 1);
    lcd.print(rtc.getTimeStr());
}

void LCDLightUp()
{
    lcd.init(); // initialize the lcd
    lcd.backlight();
    lcd.setCursor(0, 0);
    LCDText();
}

void LCDSetTime() //快速睡眠模式，单击触摸板设置时间（10min/t)，在其后闹铃响起。这期间的其他已设闹钟将会被忽略
{
    int fastSleep = 0;
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Fast Sleep Mode:");
    delay(700); //防止误操
    for (int i = 0; i < 300; i++)
    {
        if (digitalRead(7))
        {
            while (true)
            {
                if (!digitalRead(7))
                {
                    if (fastSleep < 180)
                        fastSleep += 10;
                    i = 0;
                    break;
                }
            }
        }
        if (fastSleep < 180)
        {
            lcd.setCursor(9, 1);
            lcd.print(String(fastSleep) + "min");
        }
        else
        {
            lcd.setCursor(5, 1);
            lcd.print(String(fastSleep) + "min" + " MAX");
        }
        delay(100);
    }
    if (fastSleep != 0)
    {
        lcd.clear();
        lcd.setCursor(5, 0);
        lcd.print("Good Night..");
        if (fastSleep % 60 + rtc.getTime().min >= 60)
        {
            aMinute = (fastSleep + rtc.getTime().min) % 60;
            aHour = rtc.getTime().hour + fastSleep / 60 + 1;
        }
        else
        {
            aHour = rtc.getTime().hour + fastSleep / 60;
            aMinute = rtc.getTime().min + fastSleep % 60;
        }
        delay(2000);
    }
}

/*bool touchCheck(bool Mode) //0——长按模式和1——短按模式
{
    if (Mode == 0)
    {
        for (int i = 0; i < 10; i++)
        {
            if (digitalRead(1))
            {
                delay(1000 - 100 * i);
                
            }
            delay(100);
        }
    }
    else if (Mode == 1)
    {

    }
}*/

void setup(void)
{
    pinMode(5, OUTPUT);
    digitalWrite(5, HIGH);
    pinMode(3, OUTPUT);
    digitalWrite(3, LOW);
    pinMode(2, INPUT);
    pinMode(7, INPUT);
    pinMode(SD_ChipSelectPin, OUTPUT);
    music.speakerPin = 10; //D10引脚作音频输出
    music.setVolume(7);    //0到7 设置音量级别
    music.quality(1);        //  Set 1 for 2x oversampling Set 0 for normal
    if (!SD.begin(SD_ChipSelectPin))
    {
        Serial.println("SD fail");
    }
    randomSeed(analogRead(A3)); //利用A3引脚的随机电子噪声生成随机种子
    myservo.attach(9);          // 将引脚9上的舵机与声明的舵机对象连接起来
    Serial.begin(115200);       //注意计算机串口波特率
    rtc.begin();                //初始化LCD显示屏
    lcd.init();
    lcd.noBacklight();
    Serial.print(F("setup begin\r\n"));
    delay(100);

    WifiInit(EspSerial, UARTSPEED); //初始化当前esp8266模块

    Serial.print(F("FW Version:"));
    Serial.println(wifi.getVersion().c_str());

    if (wifi.setOprToStationSoftAP())
    { //设置模式
        Serial.print(F("to station + softap ok\r\n"));
    }
    else
    {
        Serial.print(F("to station + softap err\r\n"));
    }

AP:
    if (wifi.joinAP(SSID, PASSWORD))
    { //连接热点
        Serial.print(F("Join AP success\r\n"));

        Serial.print(F("IP:"));
        Serial.println(wifi.getLocalIP().c_str()); //打印IP
    }
    else
    {
        Serial.print(F("Join AP failure\r\n"));
        goto AP;
    }

    if (wifi.disableMUX())
    { //关闭多连接
        Serial.print(F("single ok\r\n"));
    }
    else
    {
        Serial.print(F("single err\r\n"));
    }

    Serial.print(F("setup end\r\n"));
    httpRequest(0);
    httpRequest(1);
}

void loop(void)
{
    if (press == 0 && light > 30)
        counter++;

    if (counter >= 60)
    {
        counter = 0;
        httpRequest(0); //参数：0——获取最近闹钟；1——校准当前时间；2——闹钟已响起
        ifDelay = true;
        counterT++;
    }

    Serial.println(rtc.getTimeStr());
    if (timeCheck())
        PIRCheck();
    Serial.println(digitalRead(7));
    if (light > 30)
    {
        if (digitalRead(7))
            Press++;
        else
            Press = 0;
        if (Press == 2)
        {
            Press = 0;
            LCDLightUp();
            light = 0;
        }
    }
    if (light < 30)
    {
        LCDText();
        light++;
        if (digitalRead(7))
            Press++;
        else
            Press = 0;
        if (Press == 2)
        {
            Press = 0;
            LCDSetTime();
            light = 31;
            Press = 0;
            lcd.clear();
            lcd.noBacklight();
        }
    }
    else if (light == 30)
    {
        Press = 0;
        light++;
        lcd.clear();
        lcd.noBacklight();
    }
    Serial.println(digitalRead(2));
    if (!ifDelay)
        delay(1000);
    ifDelay = false;
}

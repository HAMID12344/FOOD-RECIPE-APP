import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// Provisioned Cloud Firestore named database ID from firebase-applet-config.json
const String kFirestoreDatabaseId =
    'ai-studio-foodhubliterecip-5a70dc9a-48ae-4888-b610-26f9aa435dd9';

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      default:
        return web;
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyDOdAvjYWyxjN5u8qZDb7M1JNO7iG0QynQ',
    appId: '1:792922363292:web:fd2529b5eb3ce857676459',
    messagingSenderId: '792922363292',
    projectId: 'braided-spring-0hl8x',
    authDomain: 'braided-spring-0hl8x.firebaseapp.com',
    storageBucket: 'braided-spring-0hl8x.firebasestorage.app',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyDOdAvjYWyxjN5u8qZDb7M1JNO7iG0QynQ',
    appId: '1:792922363292:web:fd2529b5eb3ce857676459',
    messagingSenderId: '792922363292',
    projectId: 'braided-spring-0hl8x',
    storageBucket: 'braided-spring-0hl8x.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyDOdAvjYWyxjN5u8qZDb7M1JNO7iG0QynQ',
    appId: '1:792922363292:web:fd2529b5eb3ce857676459',
    messagingSenderId: '792922363292',
    projectId: 'braided-spring-0hl8x',
    storageBucket: 'braided-spring-0hl8x.firebasestorage.app',
    iosClientId:
        '792922363292-tc3pk3jsll1d6c2iou6j687jacqe9jg5.apps.googleusercontent.com',
  );
}

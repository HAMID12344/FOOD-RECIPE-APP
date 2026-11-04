import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';

import '../models/kitchen_models.dart';
import '../services/firestore_service.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  // Page 1: ONLY Log In or Sign Up buttons
  // Page 2: Selected customer flow + Back button + Admin Login (Hamid Ali)
  int _page = 1;
  String _flow = 'login'; // 'login' | 'signup'
  String _customName = '';
  String _kitchenType = kKitchenSegments.first;
  String _phone = '';
  bool _loading = false;
  String? _error;

  Future<void> _signInWithGoogle({required bool asAdmin}) async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      UserCredential cred;
      final googleProvider = GoogleAuthProvider()
        ..setCustomParameters({'prompt': 'select_account'});

      if (kIsWeb) {
        cred = await FirebaseAuth.instance.signInWithPopup(googleProvider);
      } else {
        cred = await FirebaseAuth.instance.signInWithProvider(googleProvider);
      }

      final user = cred.user;
      if (user == null) return;

      final isMaster =
          KitchenFirestoreService.instance.isMasterAdminEmail(user.email);

      if (asAdmin && !isMaster) {
        await FirebaseAuth.instance.signOut();
        setState(() {
          _error =
              'Access denied: Only Master Administrator $kMasterAdminName ($kMasterAdminEmail) can use Admin Login.';
        });
        return;
      }

      await KitchenFirestoreService.instance.ensureCustomerProfile(
        user,
        customName: _flow == 'signup' ? _customName : null,
        kitchenType: _flow == 'signup' ? _kitchenType : null,
        phone: _flow == 'signup' ? _phone : null,
      );
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final cs = theme.colorScheme;

    return Scaffold(
      backgroundColor: cs.surface,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Card(
              elevation: 0,
              color: cs.surfaceContainerLow,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(28),
                side: BorderSide(color: cs.outlineVariant),
              ),
              child: Padding(
                padding: const EdgeInsets.all(28),
                child: _page == 1 ? _buildPageOne(cs) : _buildPageTwo(cs),
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// Page 1: Strictly Log In or Sign Up buttons only
  Widget _buildPageOne(ColorScheme cs) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          kAppBrandName,
          style: TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.w700,
            color: cs.onSurface,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Welcome to your kitchen hub',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: cs.onSurface,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Choose Log In to open your existing account or Sign Up to register a new kitchen profile.',
          style: TextStyle(fontSize: 14, color: cs.onSurfaceVariant),
        ),
        const SizedBox(height: 28),
        FilledButton.icon(
          onPressed: () => setState(() {
            _flow = 'login';
            _page = 2;
            _error = null;
          }),
          style: FilledButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
          ),
          icon: const Icon(Icons.login_rounded),
          label: const Text('Log In'),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: () => setState(() {
            _flow = 'signup';
            _page = 2;
            _error = null;
          }),
          style: OutlinedButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
          ),
          icon: const Icon(Icons.person_add_alt_1_rounded),
          label: const Text('Sign Up'),
        ),
      ],
    );
  }

  /// Page 2: Selected Customer Flow + Back + Admin Login (Hamid Ali)
  Widget _buildPageTwo(ColorScheme cs) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            TextButton.icon(
              onPressed: () => setState(() {
                _page = 1;
                _error = null;
              }),
              icon: const Icon(Icons.arrow_back_rounded, size: 18),
              label: const Text('Back'),
            ),
            TextButton(
              onPressed: () => setState(() {
                _flow = _flow == 'login' ? 'signup' : 'login';
                _error = null;
              }),
              child: Text(
                _flow == 'login'
                    ? 'Need an account? Sign Up'
                    : 'Have an account? Log In',
              ),
            ),
          ],
        ),
        if (_error != null) ...[
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: cs.errorContainer,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Text(
              _error!,
              style: TextStyle(fontSize: 12, color: cs.onErrorContainer),
            ),
          ),
        ],
        const SizedBox(height: 12),
        Text(
          _flow == 'login' ? 'Customer Log In' : 'Customer Sign Up',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: cs.onSurface,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          _flow == 'login'
              ? 'Continue with Google to open your Profile first and sync recipes, meal plans, and groceries.'
              : 'Complete your kitchen details below to register directly in the Customer Database.',
          style: TextStyle(fontSize: 13, color: cs.onSurfaceVariant),
        ),
        const SizedBox(height: 16),
        if (_flow == 'signup') ...[
          TextField(
            decoration: const InputDecoration(
              labelText: 'Customer Full Name (optional)',
              border: OutlineInputBorder(),
            ),
            onChanged: (v) => _customName = v,
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            value: _kitchenType,
            decoration: const InputDecoration(
              labelText: 'Kitchen Segment',
              border: OutlineInputBorder(),
            ),
            items: kKitchenSegments
                .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                .toList(),
            onChanged: (v) {
              if (v != null) setState(() => _kitchenType = v);
            },
          ),
          const SizedBox(height: 12),
          TextField(
            decoration: const InputDecoration(
              labelText: 'Phone / Campus Note (optional)',
              border: OutlineInputBorder(),
            ),
            onChanged: (v) => _phone = v,
          ),
          const SizedBox(height: 16),
        ],
        FilledButton(
          onPressed:
              _loading ? null : () => _signInWithGoogle(asAdmin: false),
          style: FilledButton.styleFrom(
            minimumSize: const Size.fromHeight(50),
          ),
          child: Text(
            _loading
                ? 'Connecting…'
                : (_flow == 'login'
                    ? 'Continue as Customer with Google'
                    : 'Sign Up with Google'),
          ),
        ),
        const SizedBox(height: 20),
        const Divider(),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Administrator Control',
              style: TextStyle(fontSize: 12, color: cs.onSurfaceVariant),
            ),
            Text(
              kMasterAdminName,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: cs.onSurfaceVariant,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        FilledButton.tonalIcon(
          onPressed:
              _loading ? null : () => _signInWithGoogle(asAdmin: true),
          style: FilledButton.styleFrom(
            minimumSize: const Size.fromHeight(48),
          ),
          icon: const Icon(Icons.verified_user_rounded, size: 18),
          label: const Text('Admin Login ($kMasterAdminName)'),
        ),
      ],
    );
  }
}

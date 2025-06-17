import React from 'react';
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Clipboard,
  Linking,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { styles } from './SwapScreen.styles';
import SelectTokenModal from '../components/SelectTokenModal';
import { useWallet } from '@/modules/wallet-providers/hooks/useWallet';
import { RootStackParamList } from '@/shared/navigation/RootNavigator';
import { AppHeader } from '@/core/shared-ui';
import Icons from '@/assets/svgs';

// Import our new components and hook
import {
  ProviderSelector,
  PumpSwapControls,
  TokenRow,
  SwapInfo,
  StatusDisplay,
  Keypad,
  androidStyles
} from '@/modules/swap/components/SwapComponents';
import { useSwapLogic, SwapRouteParams } from '@/modules/swap/hooks/useSwapLogic';
import { SwapProvider } from '@/modules/swap/services/tradeService';

// Define types for navigation and route
type SwapScreenRouteProp = RouteProp<RootStackParamList, 'SwapScreen'>;
type SwapScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SwapScreen'>;

// Swap providers
const swapProviders: SwapProvider[] = ['Jupiter', 'Raydium', 'PumpSwap'];

export default function SwapScreen() {
  const navigation = useNavigation<SwapScreenNavigationProp>();
  const route = useRoute<SwapScreenRouteProp>();
  const { publicKey: userPublicKey, connected, sendTransaction } = useWallet();

  // Get parameters from route if they exist
  const routeParams = route.params || {};

  // Handle back button press
  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      console.log('Already at root level of navigation, cannot go back');
    }
  };

  // Use our custom hook for swap logic
  const {
    // Token data
    inputToken,
    outputToken,
    currentBalance,
    currentTokenPrice,

    // UI state
    inputValue,
    estimatedOutputAmount,
    outputTokenUsdValue,
    activeProvider,
    showSelectTokenModal,
    selectingWhichSide,
    poolAddress,
    slippage,
    loading,
    resultMsg,
    errorMsg,
    solscanTxSig,

    // Computed values
    conversionRate,

    // State updaters
    setActiveProvider,
    setShowSelectTokenModal,
    setSelectingWhichSide,
    setPoolAddress,
    setSlippage,

    // Action handlers
    handleTokenSelected,
    handleMaxButtonClick,
    handleKeyPress,
    handleSwap,
    viewTransaction,
    calculateUsdValue,
    isProviderAvailable,
    isSwapButtonEnabled,
    pendingTokenOps,
    handleSwapTokens,
  } = useSwapLogic(routeParams as SwapRouteParams, userPublicKey, connected, sendTransaction, navigation);

  // Handle paste from clipboard for transaction signatures
  const handlePasteFromClipboard = async () => {
    try {
      const text = await Clipboard.getString();
      if (text) {
        // You can handle this if needed
      }
    } catch (error) {
      console.error('Failed to paste from clipboard:', error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <>
        {Platform.OS === 'android' && <View style={androidStyles.statusBarPlaceholder} />}
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" />

          <AppHeader
            title="Swap Via"
            showBackButton={route.params?.showBackButton || false}
            onBackPress={handleBack}
            style={Platform.OS === 'android' ? androidStyles.headerContainer : undefined}
          />

          <View style={styles.contentContainer}>
            <ScrollView
              style={styles.fullWidthScroll}
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 250 }} // Extra padding for keypad
            >
              {/* Swap Providers */}
              <ProviderSelector
                providers={swapProviders}
                activeProvider={activeProvider}
                setActiveProvider={setActiveProvider}
                isProviderAvailable={isProviderAvailable}
              />

              {/* PumpSwap Pool Address Input */}
              {activeProvider === 'PumpSwap' && (
                <PumpSwapControls
                  poolAddress={poolAddress}
                  setPoolAddress={setPoolAddress}
                  slippage={slippage}
                  setSlippage={setSlippage}
                />
              )}

              {/* Swap Container with Input and Output */}
              <View style={styles.swapContainer}>
                {/* Input Token (From) */}
                <View>
                  <TokenRow
                    token={inputToken}
                    balance={currentBalance}
                    isInput={true}
                    value={inputValue}
                    fiatValue={calculateUsdValue(inputValue, currentTokenPrice)}
                    onPress={() => {
                      // Only allow token selection if not already loading
                      if (pendingTokenOps.input || pendingTokenOps.output) return;
                      setSelectingWhichSide('input');
                      setShowSelectTokenModal(true);
                    }}
                    connected={connected}
                    isLoading={pendingTokenOps.input || !inputToken || currentBalance === null || currentTokenPrice === null}
                  />
                </View>

                {/* Swap Button - Positioned to overlap both cards */}
                <TouchableOpacity
                  style={styles.swapButton}
                  onPress={handleSwapTokens}
                >
                  <Icons.SwapIcon width={36} height={36} />
                </TouchableOpacity>

                {/* Output Token (To) */}
                <View>
                  <TokenRow
                    token={outputToken}
                    balance={null}
                    isInput={false}
                    value={estimatedOutputAmount || '0'}
                    fiatValue={outputTokenUsdValue}
                    onPress={() => {
                      // Only allow token selection if not already loading
                      if (pendingTokenOps.input || pendingTokenOps.output) return;
                      setSelectingWhichSide('output');
                      setShowSelectTokenModal(true);
                    }}
                    isLoading={pendingTokenOps.output || !outputToken || (parseFloat(inputValue) > 0 && !estimatedOutputAmount)}
                  />
                </View>

                {/* Max Button */}
                <TouchableOpacity
                  style={styles.maxButtonContainer}
                  onPress={handleMaxButtonClick}
                >
                  <Text style={styles.maxButtonText}>MAX</Text>
                </TouchableOpacity>
              </View>

              {/* Status Messages */}
              <StatusDisplay
                loading={loading}
                resultMsg={resultMsg}
                errorMsg={errorMsg}
              />

              {/* Additional Swap Info */}
              <SwapInfo
                conversionRate={conversionRate}
                solscanTxSig={solscanTxSig}
                activeProvider={activeProvider}
                onViewTransaction={viewTransaction}
              />
            </ScrollView>

            {/* Keypad */}
            <Keypad onKeyPress={handleKeyPress} />

            {/* Swap Button */}
            <TouchableOpacity
              style={[
                styles.swapActionButton,
                !isSwapButtonEnabled() && { opacity: 0.6 },
                Platform.OS === 'android' && androidStyles.swapActionButton
              ]}
              onPress={handleSwap}
              disabled={!isSwapButtonEnabled()}
            >
              <Text style={styles.swapActionButtonText}>
                {!connected ? 'Connect Wallet to Swap' :
                  !isProviderAvailable(activeProvider) ? `${activeProvider} Coming Soon` :
                    activeProvider === 'PumpSwap' && !poolAddress ? 'Enter Pool Address' :
                      loading ? 'Swapping...' : `Swap via ${activeProvider}`}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Token Selection Modal */}
          <SelectTokenModal
            visible={showSelectTokenModal}
            onClose={() => setShowSelectTokenModal(false)}
            onTokenSelected={handleTokenSelected}
          />
        </SafeAreaView>
      </>
    </KeyboardAvoidingView>
  );
} 
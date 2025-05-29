/* eslint-disable react-native/no-inline-styles */
import {useFocusEffect} from '@react-navigation/native';
import {useCallback, useMemo, useState} from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import CheckPresencesGoal from '../components/CheckPresencesGoal';
import StatCard from '../components/StatCard';
import StepProgressCircle from '../components/StepProgressCircle';
import {useHook} from '../hooks/ThemeContext';
import useStepWriter, {ICalculate} from '../hooks/useStepWriter';
import {
  calculateDailyStepPercentage,
  hasIncompleteGoals,
  hasIncompletePresences,
} from '../lib/utils';
import {getGoal, getUserStats} from '../lib/utils/apis';

type Props = NativeStackScreenProps<any, any>;
const HomeScreen: React.FC<Props> = ({navigation}) => {
  const [isGoalLoading, setIsGoalLoading] = useState(false);
  const [isSetUserPreferencesLoading, setIsSetUserPreferencesLoading] =
    useState(false);

  const {
    isDark,
    toggleTheme,
    user,
    goal,
    setGoal,
    userPreferences,
    setUserPreferences,
  } = useHook();
  // const [goal, setGoal] = useState<IGoal | null>(null);

  const metricsData: ICalculate = useMemo(() => {
    const defaults: ICalculate = {
      weight: 0,
      gender: 'male',
      height: 0,
      walkType: 'Slow walking',
    };

    if (userPreferences) {
      return {
        ...defaults,
        weight: userPreferences.weight || defaults.weight,
        gender: (userPreferences.gender || defaults.gender) as any,
        height: userPreferences.height || defaults.height,
        walkType: (userPreferences.activityType || defaults.walkType) as any,
      };
    }

    return defaults;
  }, [userPreferences]);
  const {steps, caloriesBurned, kilometers, iGoalReached, spendMinutes} =
    useStepWriter('Slow walking', goal?.dailyGoal || 0, metricsData);
  // const [stepMetrics, setStepMetrics] = useState<AvgStepsMetrics | null>(null);
  // const navigation = useNavigation();
  const [waterIntake, setWaterIntake] = useState(0);

  const theme = isDark ? darkStyles : lightStyles;

  useFocusEffect(
    useCallback(() => {
      let isActive = true; // Helps in preventing state updates after unmount

      const fetchData = async () => {
        setIsSetUserPreferencesLoading(true);
        try {
          if (user && user._id) {
            const stats = await getUserStats(user._id);

            if (isActive && stats.data) {
              setUserPreferences(stats.data);
              // Optional: Update state or perform any action with the fetched data
            }
          }
        } catch (error) {
        } finally {
          setIsSetUserPreferencesLoading(false);
        }
      };

      fetchData();

      return () => {
        isActive = false; // Cleanup function to avoid state updates after unmount
      };
    }, [setUserPreferences, user]),
  );

  useFocusEffect(
    useCallback(() => {
      const getGoalByUserId = async () => {
        if (user?._id) {
          setIsGoalLoading(true);
          try {
            const goalData = await getGoal(user._id);
            setGoal(goalData.data);
          } catch (error) {
            console.error('Error fetching goal:', error);
          } finally {
            setIsGoalLoading(false);
          }
        }
      };

      getGoalByUserId();
    }, [user, setGoal]),
  );

  const handleLogout = useCallback(async () => {
    try {
      // await auth().signOut();
      navigation.replace('Login');
    } catch (error: any) {}
  }, [navigation]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🏃 I’ve walked ${steps} steps today! That's ${(
          kilometers || 0
        )?.toFixed(5)} km!`,
      });
    } catch (error) {}
  };

  const progressPercentage = useMemo(
    () => calculateDailyStepPercentage(goal?.dailyGoal || 0, steps),
    [goal?.dailyGoal, steps],
  );
  const handleAddWater = useCallback(async () => {
    const newIntake = waterIntake + 250;
    setWaterIntake(newIntake);
    await AsyncStorage.setItem('waterIntake', newIntake.toString());

    // Optional: Show a small confirmation message
    Alert.alert('Water Added', '250ml of water added to your daily intake!');
  }, [waterIntake]);
  const getWaterIntake = async (): Promise<number | null> => {
    try {
      const value = await AsyncStorage.getItem('waterIntake');
      return value !== null ? parseInt(value, 10) : null;
    } catch (error) {
      console.error('Error retrieving water intake:', error);
      return null;
    }
  };
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchTheme = async () => {
        if (!user?._id) {
          return;
        }
        try {
          const waterIntakeValue = await getWaterIntake();
          if (isActive && waterIntakeValue !== null) {
            setWaterIntake(waterIntakeValue);
          }
          const themeData = await getUserStats(user._id);
          if (isActive && typeof themeData === 'boolean') {
            toggleTheme(themeData);
          }
        } catch (error) {
          console.error('Error fetching theme:', error);
        }
      };
      fetchTheme();
      return () => {
        isActive = false;
      };
    }, [toggleTheme, user]),
  );
  if (isGoalLoading || isSetUserPreferencesLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? '#0a1a3a' : '#fff',
        }}>
        <ActivityIndicator size="large" color={isDark ? '#fff' : '#0a1a3a'} />
      </View>
    );
  }
  if (
    hasIncompletePresences(userPreferences as any) ||
    hasIncompleteGoals(goal as any)
  ) {
    return (
      <CheckPresencesGoal
        navigation={navigation}
        presences={userPreferences as any}
        goal={goal as any}
        isDark={isDark}
      />
    );
  }
  return (
    <SafeAreaView style={theme.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={theme.header}>
          <Text style={theme.title}>
            {user ? `Welcome, ${user?.name || user?.email}` : 'Home'}
          </Text>
          {user && (
            <TouchableOpacity
              style={[theme.buttonOutline, isDark && {borderColor: '#fff'}]}
              onPress={handleLogout}>
              <Text style={theme.buttonTextOutline}>Log Out</Text>
            </TouchableOpacity>
          )}
        </View>

        <StepProgressCircle
          iGoalReached={iGoalReached}
          dailyStepCount={steps}
          dailyGoal={goal?.dailyGoal || 0}
          isLoadingGoal={false}
          isDark={isDark}
        />
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            width: '100%',
            gap: 10,
          }}>
          <StatCard
            label="CALORIES BURNED"
            value={caloriesBurned?.toFixed(5) ?? '0.00'}
            iconName="flame-outline"
            isDarkMode={isDark}
            iconColor={isDark ? '#fff' : '#ff7f50'}
          />
          <StatCard
            label="KILOMETERS"
            value={kilometers?.toFixed(5) ?? '0.00'}
            iconName="location-outline"
            isDarkMode={isDark}
            iconColor={isDark ? '#fff' : '#ff7f50'}
          />
          <StatCard
            label="MINUTES"
            value={spendMinutes?.toFixed(2) ?? '0.00'}
            iconName="timer-outline"
            isDarkMode={isDark}
            iconColor={isDark ? '#fff' : '#ff7f50'}
          />
          {/* <StatCard
            label="AVG / HOUR"
            value={stepMetrics?.avgStepsPerHour.toFixed(2) ?? '0.00'}
            iconName="trending-up-outline"
            isDarkMode={isDark}
            iconColor={isDark ? '#fff' : '#ff7f50'}
          /> */}
        </View>

        {/* daily progress bar */}
        <View
          style={[styles.detailCard, isDark && {backgroundColor: '#182b4d'}]}>
          <Text style={[styles.detailTitle, isDark && {color: '#fff'}]}>
            Daily Progress
          </Text>

          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                isDark && {backgroundColor: '#2c3e50'},
              ]}>
              <View
                style={[
                  styles.progressFill,
                  {width: `${progressPercentage}%`},
                  progressPercentage >= 100
                    ? {backgroundColor: '#4cd964'}
                    : progressPercentage >= 75
                    ? {backgroundColor: '#3498db'}
                    : progressPercentage >= 50
                    ? {backgroundColor: '#f39c12'}
                    : {backgroundColor: '#e74c3c'},
                ]}
              />
            </View>
            <Text style={[styles.progressText, isDark && {color: '#bbb'}]}>
              {progressPercentage?.toFixed(0)}% of daily goal
            </Text>
          </View>
        </View>
        <View
          style={[styles.detailCard, isDark && {backgroundColor: '#182b4d'}]}>
          <Text style={[styles.detailTitle, isDark && {color: '#fff'}]}>
            Water Intake Tracker
          </Text>

          <View style={styles.waterTrackerContainer}>
            <View style={styles.waterInfoContainer}>
              <Ionicons
                name="water"
                size={28}
                color={isDark ? '#3498db' : '#2980b9'}
                style={styles.waterIcon}
              />
              <Text style={[styles.waterAmount, isDark && {color: '#fff'}]}>
                {(waterIntake / 1000)?.toFixed(1)}L
              </Text>
              <Text style={[styles.waterSubtext, isDark && {color: '#bbb'}]}>
                of water today
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleAddWater}
              activeOpacity={0.7}
              style={[
                styles.waterButton,
                isDark && {backgroundColor: '#3498db'},
              ]}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.waterButtonText}>Add 250ml</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareButtonText}>📤 Share Progress</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};
export default React.memo(HomeScreen);
const shared = {
  card: {
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  label: {
    fontSize: 18,
    fontWeight: '500' as const,
    flex: 1,
    marginLeft: 10,
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold' as const,
  },
};

const lightStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    color: '#0a1a3a',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: '#0a1a3a',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  buttonTextOutline: {
    color: '#0a1a3a',
    fontWeight: 'bold',
  },
  ...shared,
  progressContainer: {
    marginBottom: 25,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  progressLabel: {
    fontSize: 16,
    marginBottom: 10,
    fontWeight: '600',
  },
  progressText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  shareButton: {
    marginTop: 10,
    padding: 14,
    backgroundColor: '#4caf50',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  shareButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

const darkStyles = StyleSheet.create({
  ...lightStyles,
  container: {
    ...lightStyles.container,
    backgroundColor: '#0a1a3a',
  },
  title: {
    ...lightStyles.title,
    color: 'white',
  },
  buttonTextOutline: {
    color: 'white',
    fontWeight: 'bold',
  },
  card: {
    ...shared.card,
    backgroundColor: '#294073',
  },
  label: {
    ...shared.label,
    color: 'white',
  },
  value: {
    ...shared.value,
    color: 'white',
  },
  progressContainer: {
    ...lightStyles.progressContainer,
    backgroundColor: '#294073',
  },
  progressLabel: {
    ...lightStyles.progressLabel,
    color: 'white',
  },
  progressText: {
    ...lightStyles.progressText,
    color: 'white',
  },
  shareButton: {
    ...lightStyles.shareButton,
    backgroundColor: '#2196f3',
  },
});
const styles = StyleSheet.create({
  detailCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ecf0f1',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3498db',
  },
  progressText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'right',
  },
  waterTrackerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  waterInfoContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  waterIcon: {
    marginBottom: 5,
  },
  waterAmount: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  waterSubtext: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  waterButton: {
    backgroundColor: '#2980b9',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  waterButtonText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 5,
  },
  shareButton: {
    marginTop: 10,
    padding: 14,
    backgroundColor: '#4caf50',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  shareButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

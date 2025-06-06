import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { colors, radius, spacingX, spacingY } from '@/constants/theme'
import { scale, verticalScale } from '@/utils/styling'
import ModalWrapper from '@/components/ModalWrapper'
import Header from '@/components/Header'
import BackButton from '@/components/BackButton'
import { Image } from 'expo-image'
import { getProfileImage } from '@/services/imageService'
import * as Icons from 'phosphor-react-native'
import Typo from '@/components/Typo'
import Input from '@/components/Input'
import { TransactionType, UserDataType, WalletType } from '@/types'
import Button from '@/components/Button'
import { useAuth } from '@/contexts/authContext'
import { updateUser } from '@/services/userService'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import ImageUpload from '@/components/ImageUpload'
import { createOrUpdateWallet, deleteWallet } from '@/services/walletService'
import { Dropdown } from 'react-native-element-dropdown'
import { expenseCategories, transactionTypes } from '@/constants/data'
import useFetchData from '@/hooks/useFetchData'
import { orderBy, where } from 'firebase/firestore'
import RNDateTimePicker, { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { createOrUpdatetransaction } from '@/services/transactionService'


const TransactionModal = () => {

  const { user } = useAuth()

  const [transaction, setTransaction] = useState<TransactionType>({
    type: 'expense',
    amount: 0,
    description: "",
    category: "",
    date: new Date(),
    walletId: "",
    image: null
  })

  const [loading, setLoading] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const router = useRouter()

  const {
    data: wallets,
    error: walletError,
    loading: walletLoading,
  } = useFetchData<WalletType>("wallets", [
    where("uid", "==", user?.uid),
    orderBy("created", "desc")
  ])


  type paramType = {
    id: string;
    type: string;
    amount: string;
    category?: string;
    date: string;
    description: string;
    image?: string;
    uid?: string;
    walletId: string;
  }


  const oldTransaction: paramType =
    useLocalSearchParams()

  const onDateChange = (event: any, selectedDate: any) => {
    const currentDate = selectedDate || transaction.date
    setTransaction({ ...transaction, date: currentDate })
    setShowDatePicker(Platform.OS == 'ios' ? true : false)
  }



  useEffect(() => {
    if (oldTransaction?.id) {
      setTransaction({
        type: oldTransaction?.type,
        amount: Number(oldTransaction.amount),
        description: oldTransaction.description || "",
        category: oldTransaction.category || "",
        date: new Date(oldTransaction.date),
        walletId: oldTransaction.walletId,
        id: oldTransaction.id,
        image: oldTransaction?.image
      })
    }
  }, [])


  const onSubmit = async () => {
    const { type, amount, description, category, date, walletId, image } = transaction

    if (!walletId || !date || !amount || (type == 'expense' && !category)) {
      Alert.alert("Transaction", "Please fill all the fields")
      return
    }


    let transactionData: TransactionType = {
      type, amount, description, category, date, walletId, image, uid: user?.uid
    }


    if (oldTransaction.id) transactionData.id = oldTransaction.id
    setLoading(true)
    const res = await createOrUpdatetransaction(transactionData)

    setLoading(false)
    if (res.success) {
      router.back()
    } else {
      Alert.alert("Transaction", res.msg)
    }
  }

  const onDelete = async () => {
    if (!oldTransaction?.id) return
    setLoading(true)
    const res = await deleteWallet(oldTransaction?.id)
    setLoading(false)
    if (res.success) {
      router.back()
    } else {
      Alert.alert("Wallet", res.msg)
    }
  }

  const showDeleteAlert = () => {
    Alert.alert("Confirm", "Are you sure you want to do this? \nThis action will remove all the transactions related to this wallet",
      [
        {
          text: "Cancel",
          onPress: () => console.log("Cancel Delete"),
          style: 'cancel'
        },
        {
          text: "Delete",
          onPress: () => onDelete(),
          style: 'destructive'
        }
      ]
    )
  }




  return (
    <ModalWrapper>
      <View style={styles.container}>
        <Header
          title={oldTransaction?.id ? "Update Transaction" : "New Transaction"}
          leftIcon={<BackButton />}
          style={{ marginBottom: spacingY._10 }}
        />

        {/* Form */}
        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>

          {/* Transaction Type */}
          <View style={styles.inputContainer}>
            <Typo color={colors.neutral200} size={16}>Type</Typo>
            {/* Dropdown Here */}
            <Dropdown
              style={styles.dropdownContainer}
              activeColor={colors.neutral700}
              placeholderStyle={styles.dropdownPlaceholder}
              selectedTextStyle={styles.dropdownSelectedText}
              iconStyle={styles.dropDownIcon}
              data={transactionTypes}
              maxHeight={300}
              labelField="label"
              valueField="value"
              itemTextStyle={styles.dropdownItemText}
              itemContainerStyle={styles.dropdownItemContainer}
              containerStyle={styles.dropdownListContainer}
              // placeholder={!isFocus ? 'Select item' : '...'}
              // searchPlaceholder="Search..."
              value={transaction.type}
              onChange={(item) => {
                setTransaction({ ...transaction, type: item.value })
              }}

            />

          </View>

          {/* Wallet Inputs */}
          <View style={styles.inputContainer}>
            <Typo color={colors.neutral200} size={16}>Wallet</Typo>
            {/* Dropdown Here */}
            <Dropdown
              style={styles.dropdownContainer}
              activeColor={colors.neutral700}
              placeholderStyle={styles.dropdownPlaceholder}
              selectedTextStyle={styles.dropdownSelectedText}
              iconStyle={styles.dropDownIcon}
              data={wallets.map(wallet => ({
                label: `${wallet?.name} (₹${wallet.amount})`,
                value: wallet?.id
              }))}
              maxHeight={300}
              labelField="label"
              valueField="value"
              itemTextStyle={styles.dropdownItemText}
              itemContainerStyle={styles.dropdownItemContainer}
              containerStyle={styles.dropdownListContainer}
              placeholder={'Select Wallet'}
              value={transaction.walletId}
              onChange={(item) => {
                setTransaction({ ...transaction, walletId: item.value || "" })
              }}

            />

          </View>

          {/* Expense Categories */}
          {
            transaction.type == 'expense' && (
              <View style={styles.inputContainer}>
                <Typo color={colors.neutral200} size={16}>Expense Category</Typo>
                {/* Dropdown Here */}
                <Dropdown
                  style={styles.dropdownContainer}
                  activeColor={colors.neutral700}
                  placeholderStyle={styles.dropdownPlaceholder}
                  selectedTextStyle={styles.dropdownSelectedText}
                  iconStyle={styles.dropDownIcon}
                  data={Object.values(expenseCategories)}
                  maxHeight={300}
                  labelField="label"
                  valueField="value"
                  itemTextStyle={styles.dropdownItemText}
                  itemContainerStyle={styles.dropdownItemContainer}
                  containerStyle={styles.dropdownListContainer}
                  placeholder={'Select Category'}
                  value={transaction.category}
                  onChange={(item) => {
                    setTransaction({ ...transaction, category: item.value || "" })
                  }}

                />

              </View>
            )
          }

          {/* Date Picker */}

          <View style={styles.inputContainer}>
            <Typo color={colors.neutral200} size={16}>Date</Typo>
            {
              !showDatePicker && (
                <Pressable
                  style={styles.dateInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Typo size={14}>{(transaction.date as Date).toLocaleDateString()}</Typo>
                </Pressable>
              )
            }

            {
              showDatePicker && (
                <View style={Platform.OS == 'ios' && styles.iosDatePicker}>
                  <RNDateTimePicker
                    themeVariant='dark'
                    value={transaction.date as Date}
                    textColor={colors.white}
                    mode='date'
                    display='spinner'
                    onChange={onDateChange}
                  />

                  {
                    Platform.OS == 'ios' && (
                      <TouchableOpacity
                        style={styles.datePickerButton}
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Typo size={15} fontWeight={'500'}>OK</Typo>
                      </TouchableOpacity>
                    )
                  }
                </View>
              )
            }
          </View>

          {/* Amount */}
          <View style={styles.inputContainer}>
            <Typo color={colors.neutral200} size={16}>Amount</Typo>
            <Input
              // placeholder='salary'
              keyboardType='numeric'
              value={transaction.amount?.toString()}
              onChangeText={(value) => setTransaction({
                ...transaction, amount: Number(value.replace(/[^0-9]/g, ""))
              })}
            />
          </View>


          {/* Description */}
          <View style={styles.inputContainer}>
            <View style={styles.flexRow}>
              <Typo color={colors.neutral200} size={16}>Description</Typo>
              <Typo color={colors.neutral500} size={14}>(optional)</Typo>
            </View>
            <Input
              // placeholder='salary'
              value={transaction.description}
              multiline
              containerStyle={{
                flexDirection: 'row',
                height: verticalScale(100),
                alignItems: 'flex-start',
                paddingVertical: 15
              }}
              onChangeText={(value) => setTransaction({
                ...transaction, description: value
              })}
            />
          </View>


          <View style={styles.inputContainer}>
            <View style={styles.flexRow}>
              <Typo color={colors.neutral200} size={16}>Receipt</Typo>
              <Typo color={colors.neutral500} size={14}>(optional)</Typo>
            </View>
            {/* Image Input */}
            <ImageUpload
              file={transaction.image}
              onClear={() => setTransaction({ ...transaction, image: null })}
              onSelect={file => setTransaction({ ...transaction, image: file })}
              placeholder='Upload Image'
            />
          </View>
        </ScrollView>
        {/* Footer */}
        <View style={styles.footer}>
          {transaction?.id && !loading && (
            <View style={styles.deleteButtonWrapper}>
              <Button onPress={showDeleteAlert} style={styles.deleteButton}>
                <Icons.Trash
                  color={colors.white}
                  size={verticalScale(24)}
                  weight='bold'
                />
              </Button>
            </View>
          )}

          <View style={styles.submitButtonWrapper}>
            <Button
              onPress={onSubmit}
              loading={loading}
              style={styles.submitButton}
            >
              <Typo color={colors.black} fontWeight={'700'}>
                {transaction?.id ? "Update" : "Submit"}
              </Typo>
            </Button>
          </View>
        </View>
      </View>

    </ModalWrapper>
  )
}

export default TransactionModal


const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacingY._20
  },

  form: {
    gap: spacingY._20,
    paddingVertical: spacingY._15,
    paddingBottom: spacingY._40
  },

  footer: {
    flexDirection: 'row',
    marginBottom: spacingY._20,
    paddingHorizontal: spacingX._5,
    gap: scale(10),
    alignItems: 'center',
  },
  deleteButtonWrapper: {
    width: scale(55),
  },
  deleteButton: {
    backgroundColor: colors.rose,
    paddingHorizontal: spacingX._15,
    marginVertical: spacingY._10,
  },
  submitButtonWrapper: {
    flex: 1,
  },
  submitButton: {
    width: '100%',
    marginVertical: spacingY._10,
  },

  inputContainer: {
    gap: spacingY._10
  },

  iosDropDown: {
    flexDirection: 'row',
    height: verticalScale(54),
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: verticalScale(14),
    borderWidth: 1,
    color: colors.white,
    borderColor: colors.neutral300,
    borderRadius: radius._17,
    borderCurve: 'continuous',
    paddingHorizontal: spacingX._15
  },

  androidDropdown: {
    height: verticalScale(54),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    fontSize: verticalScale(14),
    color: colors.white,
    borderColor: colors.neutral300,
    borderRadius: radius._17,
    borderCurve: 'continuous'
  },

  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingX._5
  },

  dateInput: {
    flexDirection: 'row',
    height: verticalScale(54),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.neutral300,
    borderRadius: radius._17,
    borderCurve: 'continuous',
    paddingHorizontal: spacingX._15
  },

  iosDatePicker: {

  },


  datePickerButton: {
    backgroundColor: colors.neutral700,
    alignSelf: "flex-end",
    padding: spacingY._7,
    marginRight: spacingX._7,
    paddingHorizontal: spacingY._15,
    borderRadius: radius._10,
  },
  dropdownContainer: {
    height: verticalScale(54),
    borderWidth: 1,
    borderColor: colors.neutral300,
    paddingHorizontal: spacingX._15,
    borderRadius: radius._15,
    borderCurve: "continuous",
  },
  dropdownItemText: { color: colors.white },
  dropdownSelectedText: {
    color: colors.white,
    fontSize: verticalScale(14),
  },

  dropdownListContainer: {
    backgroundColor: colors.neutral900,
    borderRadius: radius._15,
    borderCurve: "continuous",
    paddingVertical: spacingY._7,
    top: 5,
    borderColor: colors.neutral500,
    shadowColor: colors.black!,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 5,
  },

  dropdownPlaceholder: {
    color: colors.white,
  },

  dropdownItemContainer: {
    borderRadius: radius._15,
    marginHorizontal: spacingX._7,
  },

  dropDownIcon: {
    height: verticalScale(30),
    tintColor: colors.neutral300
  }

})